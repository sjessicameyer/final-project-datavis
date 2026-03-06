library(dplyr)
library(tidyr)
library(class)
library(ggplot2)
library(sf)
library(marmap)

candidates <- c(
  "raw_species_data.csv",
  "data/raw_species_data.csv",
  "data/unformatted_data/raw_species_data.csv",
  "../raw_species_data.csv"
)

input_file <- candidates[file.exists(candidates)][1]

if (is.na(input_file)) {
  stop("Error: Input file 'raw_species_data.csv' not found. Run pull_data.r first or check your working directory.")
}

# Set output directory to match input file location
data_dir <- dirname(input_file)
output_grid <- file.path(data_dir, "predicted_communities.csv")
output_comp <- file.path(data_dir, "community_composition.csv")
bathy_file <- file.path(data_dir, "bathy_matrix.rds")

cat("Loading data from:", input_file, "\n")
raw_data <- read.csv(input_file)

# Create species to kingdom mapping
species_kingdom_map <- raw_data %>%
  select(species, kingdom) %>%
  distinct()

# Ensure depth_layer is an ordered factor for logical plotting/modeling
raw_data$depth_layer <- factor(raw_data$depth_layer, 
                               levels = c("Epipelagic Zone", "Mesopelagic Zone", "Bathypelagic Zone", "Abyssopelagic Zone"))

# --- Prepare Bathymetry for Masking ---
cat("Loading bathymetry data to mask invalid depth zones...\n")
if (file.exists(bathy_file)) {
  bathy_mtx <- readRDS(bathy_file)
} else {
  bathy_mtx <- getNOAA.bathy(lon1 = -180, lon2 = 180, lat1 = -90, lat2 = 90, resolution = 60)
  saveRDS(bathy_mtx, bathy_file)
}

# --- Pre-calculate Species Depth Distribution ---
# This prevents surface species (like Stenella longirostris) from appearing in deep zones
# due to data noise. We filter out species from a zone if < 5% of their total abundance is found there.
cat("Calculating species depth profiles to filter contaminants...\n")
species_profiles <- raw_data %>%
  group_by(species, depth_layer) %>%
  summarise(abundance = sum(total_abundance, na.rm = TRUE), .groups = "drop") %>%
  group_by(species) %>%
  mutate(total_abundance = sum(abundance), prop = abundance / total_abundance) %>%
  ungroup()

all_predictions <- list()
all_compositions <- list()
global_id_counter <- 0

deg2rad <- function(deg) return(deg * pi / 180)

# --- Loop through each depth layer independently ---
for (zone in levels(raw_data$depth_layer)) {
  cat(paste("\n--- Processing Zone:", zone, "---\n"))
  
  # 1. Subset data for this zone
  zone_data <- raw_data %>% filter(depth_layer == zone)
  
  if (nrow(zone_data) == 0) next
  
  # Identify valid species for this zone (must have > 20% of their population here)
  valid_species <- species_profiles %>%
      filter(depth_layer == zone, prop >= 0.20) %>% 
      pull(species)
  
  # Prune surface-only taxa from deep zones
  if (zone %in% c("Bathypelagic Zone", "Abyssopelagic Zone")) {
    surface_taxa <- c("Stenella", "Scomber", "Delphinus", "Tursiops", "Clupea", "Mallotus")
    valid_species <- valid_species[!grepl(paste(surface_taxa, collapse="|"), valid_species)]
  }

  # 2. Identify top species JUST for this zone (prevents surface fish from dominating deep zones)
  top_species <- zone_data %>%
    filter(species %in% valid_species) %>%
    group_by(species) %>%
    summarise(total = sum(total_abundance, na.rm = TRUE), .groups = "drop") %>%
    slice_max(total, n = 100) %>% # Top 100 species for finer granularity
    pull(species)
  
  # 3. Create Matrix
  site_matrix <- zone_data %>%
    filter(species %in% top_species) %>%
    group_by(lat_bin, lon_bin, species) %>%
    summarise(abundance = sum(total_abundance, na.rm = TRUE), .groups = "drop") %>%
    pivot_wider(names_from = species, values_from = abundance, values_fill = 0)
  
  # Filter empty sites
  valid_sites <- rowSums(site_matrix %>% select(-lat_bin, -lon_bin)) > 0
  site_matrix <- site_matrix[valid_sites, ]
  
  if (nrow(site_matrix) == 0) {
    cat("Skipping zone", zone, "- no valid sites after filtering.\n")
    next
  }
  
  # Normalize (Hellinger Transformation for better ecological clustering)
  mat <- as.matrix(site_matrix %>% select(-lat_bin, -lon_bin))
  row_sums <- rowSums(mat)
  # Use the square root only for the surface where data is cleaner
  if (zone == "Epipelagic Zone") {
    mat_norm <- sqrt(mat / ifelse(row_sums == 0, 1, row_sums))
  } else {
    # For deep zones, use raw relative abundance to prevent magnifying noise
    mat_norm <- mat / ifelse(row_sums == 0, 1, row_sums)
  }
  
  # 4. Cluster (K-Means) with Spatial Balancing
  set.seed(42)
  k_per_zone <- 12 
  
  # Create coarse grid for sampling
  site_matrix$coarse_lat <- floor(site_matrix$lat_bin / 20) * 20
  site_matrix$coarse_lon <- floor(site_matrix$lon_bin / 20) * 20
  
  # Sample max 5 sites per coarse grid cell for training
  training_indices <- site_matrix %>%
    mutate(row_id = row_number()) %>%
    group_by(coarse_lat, coarse_lon) %>%
    slice_sample(n = 5) %>%
    pull(row_id)
    
  training_mat <- mat_norm[training_indices, ]
  
  # Fallback if training set is too small
  if (nrow(training_mat) < k_per_zone) training_mat <- mat_norm
  if (nrow(training_mat) < k_per_zone) k_per_zone <- nrow(training_mat)
  
  clusters_model <- kmeans(training_mat, centers = k_per_zone)
  
  # Assign Global IDs
  # Find nearest cluster center for ALL sites (not just training ones)
  centers_t <- t(clusters_model$centers)
  site_matrix$local_cluster <- apply(mat_norm, 1, function(row) {
    which.min(colSums((centers_t - row)^2))
  })
  
  # Clean up temp columns
  site_matrix$coarse_lat <- NULL
  site_matrix$coarse_lon <- NULL
  
  site_matrix$community_id <- factor(site_matrix$local_cluster + global_id_counter)
  
  # 5. Predict for Global Grid using KNN (Spatial Interpolation)
  lat_seq <- seq(-85, 85, by = 1)
  lon_seq <- seq(-180, 180, by = 1)
  grid_subset <- expand.grid(lat_bin = lat_seq, lon_bin = lon_seq)
  grid_subset$depth_layer <- zone

  # Get depth for each point in the grid using bilinear interpolation from the bathy object
  # This is more accurate than the previous rounding/joining method.
  cat("Masking grid based on bathymetry...\n")
  grid_depths <- get.depth(bathy_mtx, x = grid_subset$lon_bin, y = grid_subset$lat_bin, locator = FALSE)
  grid_subset$seafloor_depth <- grid_depths$depth

  # Define depth threshold for this zone (depths are negative)
  depth_limit <- switch(zone,
                        "Epipelagic Zone" = 0,
                        "Mesopelagic Zone" = -200,
                        "Bathypelagic Zone" = -1000,
                        "Abyssopelagic Zone" = -4000)
  
  grid_subset <- grid_subset %>% filter(seafloor_depth <= depth_limit)
  
  # Convert Lat/Lon to 3D Cartesian coordinates for accurate global distance (Spherical KNN)
  site_matrix$X <- cos(deg2rad(site_matrix$lat_bin)) * cos(deg2rad(site_matrix$lon_bin))
  site_matrix$Y <- cos(deg2rad(site_matrix$lat_bin)) * sin(deg2rad(site_matrix$lon_bin))
  site_matrix$Z <- sin(deg2rad(site_matrix$lat_bin))
  
  grid_subset$X <- cos(deg2rad(grid_subset$lat_bin)) * cos(deg2rad(grid_subset$lon_bin))
  grid_subset$Y <- cos(deg2rad(grid_subset$lat_bin)) * sin(deg2rad(grid_subset$lon_bin))
  grid_subset$Z <- sin(deg2rad(grid_subset$lat_bin))
  
  cat("Running KNN spatial interpolation for", zone, "...\n")
  # Increase k to smooth out the borders 
  k_smooth <- round(sqrt(nrow(site_matrix)))
  if (k_smooth %% 2 == 0) k_smooth <- k_smooth + 1
  
  grid_subset$predicted_community_id <- knn(train = site_matrix[, c("X", "Y", "Z")],
                                            test = grid_subset[, c("X", "Y", "Z")],
                                            cl = site_matrix$community_id,
                                            k = k_smooth)
  all_predictions[[zone]] <- grid_subset
  
  # 7. Characterize Composition
  comp <- site_matrix %>%
    select(-lat_bin, -lon_bin, -local_cluster, -X, -Y, -Z) %>%
    group_by(community_id) %>%
    summarise(across(everything(), mean)) %>%
    pivot_longer(-community_id, names_to = "species", values_to = "avg_abundance") %>%
    left_join(species_kingdom_map, by = "species") %>%
    filter(avg_abundance > 0) %>% # This removes any species that are completely absent
    group_by(community_id) %>%
    filter(avg_abundance > 0.1) %>%
    slice_max(avg_abundance, n = 5, with_ties = FALSE) %>% # This forces a strict cut-off at 5
    arrange(community_id, desc(avg_abundance))
  
  all_compositions[[zone]] <- comp
  
  global_id_counter <- global_id_counter + k_per_zone
}

pred_grid <- bind_rows(all_predictions)
community_profiles <- bind_rows(all_compositions)
pred_grid_clean <- pred_grid %>% select(-X, -Y, -Z, -seafloor_depth)

# Diagnostic check for equator points
equator_check <- pred_grid_clean %>% filter(lat_bin == 0)
if (nrow(equator_check) > 0) {
  cat("\n[DIAGNOSTIC] Check successful: Found", nrow(equator_check), "data points along the equator (lat_bin = 0).\n")
} else {
  cat("\n[DIAGNOSTIC] Check failed: No data points found along the equator.\n")
}

write.csv(pred_grid_clean, output_grid, row.names = FALSE)
write.csv(community_profiles, output_comp, row.names = FALSE)

cat("Success!\n")

# --- Visualize Map ---
cat("Generating static map image...\n")
world_map <- map_data("world")

p <- ggplot() +
  geom_tile(data = pred_grid_clean, aes(x = lon_bin, y = lat_bin, fill = factor(predicted_community_id))) +
  geom_polygon(data = world_map, aes(x = long, y = lat, group = group), fill = "grey80", color = "black", size = 0.1) +
  facet_wrap(~depth_layer) +
  scale_fill_viridis_d(option = "turbo", guide = "none") + 
  labs(title = "Predicted Ecological Communities", 
       subtitle = paste("Model predicting", length(unique(pred_grid_clean$predicted_community_id)), "distinct communities"),
       x = "Longitude", y = "Latitude") +
  theme_minimal() +
  coord_quickmap()

output_img <- sub(".csv$", ".png", output_grid)
ggsave(output_img, plot = p, width = 16, height = 10)
cat("Map image saved to:", output_img, "\n")
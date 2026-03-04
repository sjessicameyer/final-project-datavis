library(duckdb)
library(dplyr)

con <- dbConnect(duckdb())
dbExecute(con, "INSTALL httpfs; LOAD httpfs;")
dbExecute(con, "SET s3_region='us-east-1';")

dir.create('./duckdb_temp/', recursive = TRUE, showWarnings = FALSE)
dbExecute(con, "SET preserve_insertion_order = false;") 
dbExecute(con, "SET memory_limit = '4GB';")
dbExecute(con, "SET temp_directory = './duckdb_temp/';")
dbExecute(con, "SET max_temp_directory_size = '10GB';")

obis_cloud <- "./occurrence/*.parquet"

query <- "
SELECT 
  interpreted.kingdom, 
  interpreted.genus,
  interpreted.scientificName AS species,
  interpreted.minimumDepthInMeters AS depth, 
  interpreted.decimalLatitude, 
  interpreted.decimalLongitude, 
  interpreted.individualCount
FROM read_parquet(?)
WHERE interpreted.date_year >= 2010
  AND interpreted.kingdom IN ('Animalia', 'Plantae') 
  AND interpreted.genus IS NOT NULL 
  AND interpreted.minimumDepthInMeters IS NOT NULL 
  AND interpreted.decimalLatitude IS NOT NULL
"

binned_data <- dbGetQuery(con, query, params = list(obis_cloud)) %>%
  mutate(
    count_fixed = ifelse(is.na(as.numeric(individualCount)) | as.numeric(individualCount) <= 0, 1, as.numeric(individualCount)),
    lat_bin = round(decimalLatitude, 1),
    lon_bin = round(decimalLongitude, 1),
    depth_layer = case_when(
      depth < 200  ~ "Epipelagic Zone",
      depth < 1000 ~ "Mesopelagic Zone",
      depth < 4000 ~ "Bathypelagic Zone",
      TRUE         ~ "Abyssopelagic Zone"
    )
  ) %>%
  group_by(kingdom, genus, species, lat_bin, lon_bin, depth_layer) %>%
  summarise(
    sighting_frequency = n(),
    total_abundance = sum(count_fixed),
    .groups = "drop"
  )

write.csv(binned_data, "../ocean_ecological_zones_FINAL.csv", row.names = FALSE)
dbDisconnect(con, shutdown = TRUE)
print("Process Complete!")
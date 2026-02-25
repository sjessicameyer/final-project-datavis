import polars as pl

input_file = "obis_data.csv"
output_file = "binned_ocean_data.csv"

# Processing pipeline
lazy_plan = (
    pl.scan_csv(input_file, infer_schema_length=10000)
    
    .filter(
        (pl.col("depth").is_not_null()) & 
        (pl.col("genus").is_not_null()) &
        (pl.col("occurrenceStatus") == "present")
    )
    
    .with_columns([
        pl.col("decimalLatitude").round(1).alias("lat_bin"),
        pl.col("decimalLongitude").round(1).alias("lon_bin"),
        pl.when(pl.col("depth") < 200).then("Epipelagic Zone")
        .when(pl.col("depth") < 1000).then("Mesopelagic Zone")
        .when(pl.col("depth") < 4000).then("Bathypelagic Zone")
        .otherwise("Abyssopelagic Zone")
        .alias("depth_layer")
    ])
    
    .group_by(["genus", "lat_bin", "lon_bin", "depth_layer"])
    
    .agg([
        pl.len().alias("frequency"),
        pl.col("kingdom").first().alias("kingdom")
    ])
    
    .sort(["lat_bin", "lon_bin", "depth_layer", "frequency"], descending=[False, False, False, True])
)

print("Processing....")
final_table = lazy_plan.collect()
final_table.write_csv(output_file)

print(f"Success! Exported to {output_file}")
print(f"Reduced to {len(final_table)} summary rows.")
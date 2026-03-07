# Final Project - Marine Diversity Dive
Our site can be accessed [here](https://sjessicameyer.github.io/final-project-datavis/)!

The Marine Diversity Dive is a simple visualization of the distribution of marine biodiversity across different depth ocean zones.

[![Watch the demo](assets\first_page.png)](assets\demo.mp4)

## Using the Site
Upon entering the site, users will be greeted with a map of the world centered on the Pacific Ocean. The map is color coded by Ecological Community group per layer, and the layer can be changed using the dropdown in the top right of the map. The map can be zoomed using the scroll wheel or other scroll functionality, or through the plus and minus buttons located in the bottom right corner of the map. Additionally, the map can be dragged around to locate more precise regions. After clicking on any water source on the map, the program will begin its "dive". Users can then scroll through the different marine zones located at the region they selected and explore the most common marine life at each depth.

After a user is done exploring, they can learn more about the project by click on the "Methodology", "Process Book", or "Video" buttons at the top of the site to be brought down to the relevant section in our write-up of the site.

## Code Overview
The full code can be found in the root of this project. All fully and semi processed data can be found in the [/data](data) folder, along with the scripts used to generate and refine each file. For more information on our data pipeline, see the [Process Book](process_book.md).

All javascript and HTML files in the root folder contain code from both team members. [Cole Golding](https://github.com/cgolding8) focused primarily on the map visualization, API access, marine life generation, and data cleaning. [Sarah Meyer](https://github.com/sjessicameyer) focused primarily on the data pipeline, visual presentation (including the "dive" functionality, site structure, and additional design elements), documentation, and marine life movement.

### Additional Resources
- [Topojson](https://github.com/topojson/topojson) was used to draw the interactive map
- [CSS Filter Generator](https://codepen.io/sosuke/pen/Pjoqqp) was used to generate CSS color filters for our various fish SVGs
- [PhyloPic](https://www.phylopic.org/articles/api-recipes)'s API was used to pull SVGs of each marine creature using a combination of various taxonomic levels
- [National Library of Medicine (NCBI)](https://www.ncbi.nlm.nih.gov/datasets/docs/v2/api/rest-api/)'s API was used to pull further taxonomic information such as further classification data as well as common species and group names

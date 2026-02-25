// Global state
const state = {
    selectedLocation: null,
    data: [],
    layers: [
        { name: "Epipelagic Zone", depth: "0-200m", color: "#66ccff" },
        { name: "Mesopelagic Zone", depth: "200-1000m", color: "#3399cc" },
        { name: "Bathypelagic Zone", depth: "1000-4000m", color: "#006699" },
        { name: "Abyssopelagic Zone", depth: "4000m+", color: "#003366" }
    ]
};


document.addEventListener("DOMContentLoaded", () => {
    loadData();
    initMap();
});

function loadData() {
    // TODO: Load OBIS data here
    d3.csv("data/marine_diversity.csv").then(data => {
        state.data = data;
        console.log("Data loaded");
    });
    console.log("Loading data placeholder...");
}

function initMap() {
    // Placeholder for Map Logic
    const mapContainer = d3.select("#map-container");
    
    mapContainer.on("click", () => {
        state.selectedLocation = "Atlantic Ocean (Mock)";
        startDive();
    });
}

function startDive() {
    console.log("Starting dive at:", state.selectedLocation);
    
    d3.select("#map-section").style("display", "none");
    d3.select("#dive-section").classed("hidden", false);
    
    setupDiveVisualization();
}

function setupDiveVisualization() {
    const container = d3.select("#scroll-content");
    const stickyVis = d3.select("#vis-sticky");
    
    state.layers.forEach(layer => {
        const step = container.append("div")
            .attr("class", "step")
            .attr("data-layer", layer.name);
            
        step.append("div")
            .attr("class", "step-content")
            .html(`
                <h2>${layer.name}</h2>
                <p>Depth: ${layer.depth}</p>
                <p>Diversity data visualization goes here.</p>
            `);
    });

    // Intersection Observer for scrollytelling
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const layerName = entry.target.getAttribute("data-layer");
                updateVisualization(layerName);
            }
        });
    }, {
        threshold: 0.5 // Trigger when 50% of the element is visible
    });

    document.querySelectorAll('.step').forEach(step => {
        observer.observe(step);
    });
}

function updateVisualization(layerName) {
    const layer = state.layers.find(l => l.name === layerName);
    const vis = d3.select("#vis-sticky");
    
    vis.transition().duration(1000)
       .style("background-color", layer.color);
       
    vis.text(`Visualizing: ${layer.name} (${state.selectedLocation})`);
    
    // TODO: Render specific D3 charts for this layer here
}
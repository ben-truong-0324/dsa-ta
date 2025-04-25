import { updateCharts } from './charts.js';

document.addEventListener("DOMContentLoaded", function () {
    const econFilter = d3.select("#econ-size-filter");
    const regionFilter = d3.select("#region-filter");

    function updateAllCharts() {
        const selectedEcon = econFilter.property("value");
        const selectedRegion = regionFilter.property("value");
        updateCharts(selectedEcon, selectedRegion);
    }

    econFilter.on("change", updateAllCharts);
    regionFilter.on("change", updateAllCharts);

});

export function loadChoroplethMap(selectedEconCategory, selectedRegion) {

        // enter code to create svg
        let svg = d3.select("#choropleth-map")
        const width = svg.node().getBoundingClientRect().width;
        const height = svg.node().getBoundingClientRect().height;

        var color_scale = d3.scaleSequential(d3.interpolatePlasma);

        var projection = d3.geoNaturalEarth1()
        var path = d3.geoPath(projection)

        svg.selectAll("*").remove();
        // define any other global variables
        var countries = svg.append("g")
                           .attr("id", "countries")


        Promise.all([
            d3.json("data/world_countries.json"),
            d3.json("data/metrics_by_countries.json")
        ]).then(function(data){
            ready(null, data[0], data[1])
        }).catch(function(error){
            ready(error, null, null)
        });


        function ready(error, world, econ_data) {
            if (error){
                console.log("Promise function threw an error: " + error)
                return;
            }

            createMapAndLegend(world, econ_data, selectedEconCategory, selectedRegion);
        }

        function categorizeEconomy(size) {
            if (size < 100) return "Small";
            if (size >= 100 && size < 200) return "Medium";
            return "Large";
        }

    function createMapAndLegend(world, econ_data, selectedEconCategory, selectedRegion){
        let dataMap = {};
        econ_data.forEach(d => {
            d.size_category = categorizeEconomy(d.econ_size);
            dataMap[d.economy_code] = {
                accuracy: d.accuracy,
                econ_size: d.econ_size,
                category: d.size_category,
                region: d.regionwb,
                population: Math.round(d.population)
            };
        });

        const population = econ_data.map(d => d.population);
        console.log(population)
        const color_scale = d3.scaleLog().domain([d3.min(population),d3.max(population)]).interpolate(() => d3.interpolateBlues); ;
        // Draw countries
        const countryPaths = countries.selectAll("path")
            .data(world.features)
            .enter()
            .append("path")
            .attr("class", "countries")
            .attr("d", path)
            .attr("stroke", "#fff")
            .attr("fill", d => {
                    const countryName = d.properties.name;
                    const countryData = dataMap[countryName];

                    if (!countryData) return "#999";

                    const matchesRegion = selectedRegion === "all" || countryData.region === selectedRegion;
                    const matchesEcon = selectedEconCategory === "all" || countryData.category === selectedEconCategory;

                    // Only color countries if both filters match, otherwise use grey
                    return (matchesRegion && matchesEcon) ? color_scale(countryData.population) : "#999";
                })
            .attr("data-category", d => {
                const countryName = d.properties.name;
                return dataMap[countryName] ? dataMap[countryName].category : "unknown";
            })
            .attr("opacity", d => {
                const countryName = d.properties.name;
                const countryData = dataMap[countryName];

                // If not in the metrics data, dim it
                if (!countryData) return 0.2;

                const matchesEcon = selectedEconCategory === "all" || countryData.category === selectedEconCategory;
                const matchesRegion = selectedRegion === "all" || countryData.region === selectedRegion;

                // Highlight if in data AND matches filter
                return (matchesEcon && matchesRegion) ? 1 : 0.2;
            })
                .on("mouseover", function (d) {
                    const event = d3.event; // 👈 get the event this way in v5

                    const countryName = d.properties.name;
                    const countryData = dataMap[countryName];

                    if (!countryData) return;

                    const tooltip = d3.select("#map-tooltip");

                    tooltip.style("display", "block")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY + 10) + "px")
                        .html(`
                            <strong>${countryName}</strong><br>
                            Population: ${countryData.population.toLocaleString()}<br>
                            Economy Size: ${countryData.econ_size}
                        `);
                })
                .on("mouseout", function () {
                    d3.select("#map-tooltip").style("display", "none");
                });


        function updateTopCountriesTable(dataMap, selectedEconCategory, selectedRegion) {
    // Filter countries based on the selected economy size and region
                const filteredCountries = Object.entries(dataMap)
                    .filter(([countryCode, countryData]) => {
                        const matchesRegion = selectedRegion === "all" || countryData.region === selectedRegion;
                        const matchesEcon = selectedEconCategory === "all" || countryData.category === selectedEconCategory;
                        return matchesRegion && matchesEcon;
                    })
                    .sort((a, b) => b[1].population - a[1].population) // Sort by population in descending order
                    .slice(0, 15); // Get the top 15 countries

                // Update the table with the filtered countries
                const tableBody = d3.select("#top-countries-table tbody");
                tableBody.selectAll("*").remove(); // Clear existing rows

                filteredCountries.forEach(([countryCode, countryData], index) => {
                    tableBody.append("tr")
                        .html(`
                            <td>${index + 1}</td>
                            <td>${countryCode}</td>
                            <td>${countryData.population.toLocaleString()}</td>
                        `);
                });
            }
            updateTopCountriesTable(dataMap, selectedEconCategory, selectedRegion);
}
}
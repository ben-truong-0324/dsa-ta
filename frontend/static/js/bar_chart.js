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

export function loadBarChart(selectedCategory, selectedRegion) {

    let svg = d3.select("#feature-bar-chart"),
        width = svg.node().getBoundingClientRect().width,
        height = svg.node().getBoundingClientRect().height,
         margin = { top: 40, right: 30, bottom: 100, left: 80 };

    svg.selectAll("*").remove();
    const chartArea = svg.append("g")
                         .attr("transform", `translate(${margin.left},${margin.top})`);

    Promise.all([
        d3.json("data/ft_importance.json"),
        d3.json("data/ft2verbose.json"),
        d3.json("data/metrics_by_countries.json")
    ]).then(function([importanceData, ft2verbose, metricsData]) {
        const grouped = groupFeaturesByEconomy(importanceData);

        console.log("Metrics Data")
        console.log(metricsData)

        function updateChart(econCategory) {
            const econCodes = filterCountriesByEconomy(metricsData, econCategory, selectedRegion);
            const topFeatures = computeTopFeatures(grouped, econCodes, ft2verbose);
            drawBarChart(topFeatures);
        }

        updateChart(selectedCategory);

        function drawBarChart(data) {
            const tooltip = d3.select("#bar-tooltip");
            chartArea.selectAll("*").remove();

            const x_scale_max = d3.max(data, d => d.avg_importance)
            console.log(x_scale_max)

            const x = d3.scaleLinear()
                        .domain([0, x_scale_max * 1.05])
                        .range([0, width - margin.left - margin.right]);

            const y = d3.scaleBand()
                        .domain(data.map(d => d.feature))
                        .range([0, height - margin.top - margin.bottom])
                        .padding(0.2);

            const tickStep = 0.02;
            const tickValues = d3.range(0, Math.ceil(x_scale_max / tickStep) * tickStep + tickStep, tickStep);
            // Axes
            chartArea.append("g")
                .call(d3.axisLeft(y));
            chartArea.append("g")
                .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
                .call(d3.axisBottom(x).tickValues(tickValues).tickFormat(d3.format(".0%")));

            console.log(data)

            // Bars
            chartArea.selectAll(".bar")
                .data(data)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("y", d => y(d.feature))
                .attr("width", d => x(d.avg_importance))
                .attr("height", y.bandwidth())
                .attr("fill", "#4682b4")
                .on("mouseover", function(d) {
                    console.log("Hovered data:", d);
                    console.log("Verbose:", d.verbose);
                    d3.select("#bar-tooltip")
                      .style("visibility", "visible")
                      .html(`<strong>${d.verbose}</strong>`);
                    d3.select(this).attr("fill", "#315f7d");
                })
                .on("mousemove", function() {
                    d3.select("#bar-tooltip")
                      .style("top", (d3.event.pageY - 30) + "px")
                      .style("left", (d3.event.pageX + 15) + "px");
                })
                .on("mouseout", function() {
                    d3.select("#bar-tooltip")
                      .style("visibility", "hidden");
                    d3.select(this).attr("fill", "#4682b4");
                })

            chartArea.selectAll(".bar-label")
                    .data(data)
                    .enter()
                    .append("text")
                    .attr("class", "bar-label")
                    .attr("x", d => x(d.avg_importance) + 5) // add a bit of space to the right of the bar
                    .attr("y", d => y(d.feature) + y.bandwidth() / 2)
                    .attr("dy", "0.35em")
                    .text(d => d3.format(".1%")(d.avg_importance))
                    .style("font-size", "12px")
                    .style("fill", "#333");
        }
    });

}

function groupFeaturesByEconomy(data) {
    const result = {};
    data.forEach(d => {
        if (!result[d.economy_code]) {
            result[d.economy_code] = [];
        }
        result[d.economy_code].push({ feature: d.feature, importance: d.importance });
    });
    return result;
}

function filterCountriesByEconomy(metrics, category = "all", region = "all") {
    console.log(region)
    const cat = category.toLowerCase();
    const regionFilter = region;

    return metrics
        .filter(d => {
            const sizeMatch =
                cat === "all" ||
                (cat === "small" && d.econ_size < 100) ||
                (cat === "medium" && d.econ_size >= 100 && d.econ_size < 200) ||
                (cat === "large" && d.econ_size >= 200);

            const regionMatch = regionFilter === "all" || d.regionwb === regionFilter;

            return sizeMatch && regionMatch;
        })
        .map(d => d.economy_code);
}

function computeTopFeatures(groupedData, econCodes, ft2verbose) {
    const featureSums = {};
    const featureCounts = {};

    econCodes.forEach(code => {
        const features = groupedData[code] || [];
        features.forEach(f => {
            featureSums[f.feature] = (featureSums[f.feature] || 0) + f.importance;
            featureCounts[f.feature] = (featureCounts[f.feature] || 0) + 1;
        });
    });

    const avgFeatures = Object.keys(featureSums).map(f => ({
        feature: f,
        avg_importance: featureSums[f] / featureCounts[f],
        verbose: ft2verbose[f] || f
    }));

    return avgFeatures.sort((a, b) => b.avg_importance - a.avg_importance).slice(0, 10);
}

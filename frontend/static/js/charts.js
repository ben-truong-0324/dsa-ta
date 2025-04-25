import {loadChoroplethMap} from './choropleth_map.js'
import {loadBarChart} from './bar_chart.js'


export function updateCharts(selectedEconCategory, selectedRegion) {
    loadBarChart(selectedEconCategory, selectedRegion);
    loadChoroplethMap(selectedEconCategory, selectedRegion);
}

function updateMap(selectedCategory) {
    loadChoroplethMap(selectedCategory);
}

function updateBarChart(selectedCategory) {
    loadBarChart(selectedCategory);
}
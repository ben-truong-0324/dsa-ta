import { updateCharts } from './charts.js';

document.addEventListener("DOMContentLoaded", function () {
    updateCharts("all");

    d3.select("#econ-size-filter").on("change", function () {
        const selectedCategory = this.value;
        updateCharts(selectedCategory);
    });
});
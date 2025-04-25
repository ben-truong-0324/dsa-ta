document.addEventListener("DOMContentLoaded", function () {
    d3.json("data/metrics_by_cluster.json").then(data => {
    renderPerformanceTable(data);
    }).catch(error => {
    console.error("Failed to load model performance data:", error);
    });

});


function computeAveragesByClusterMethod(data) {
    const grouped = {};

    // Group data by cluster_method
    data.forEach(d => {
        const method = d.cluster_method;
        if (!grouped[method]) {
            grouped[method] = {
                totalAccuracy: 0,
                totalF1: 0,
                totalPrecision: 0,
                count: 0
            };
        }

        grouped[method].totalAccuracy += d.accuracy;
        grouped[method].totalF1 += d.f1_score;
        grouped[method].totalPrecision += d.precision;
        grouped[method].count += 1;
    });

    // Compute averages
    const averages = {};
    for (const method in grouped) {
        const g = grouped[method];
        averages[method] = {
            avg_accuracy: g.totalAccuracy / g.count,
            avg_f1_score: g.totalF1 / g.count,
            avg_precision: g.totalPrecision / g.count
        };
    }

    return averages;
}

function renderPerformanceTable(data) {
    const stats = computeAveragesByClusterMethod(data);

    const container = document.querySelector(".performance-table");

    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Clustering Method</th>
                    <th>Average Accuracy</th>
                    <th>Average F1 Score</th>
                    <th>Average Precision</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const method in stats) {
        const { avg_accuracy, avg_f1_score, avg_precision } = stats[method];
        tableHTML += `
            <tr>
                <td>${method}</td>
                <td>${(avg_accuracy * 100).toFixed(2)}%</td>
                <td>${(avg_f1_score * 100).toFixed(2)}%</td>
                <td>${(avg_precision * 100).toFixed(2)}%</td>
            </tr>
        `;
    }

    tableHTML += `
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}
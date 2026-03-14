(function () {
  const dispatcher = window.chartDispatcher;
  const container = d3.select("#chart4");

  const margin = { top: 40, right: 40, bottom: 40, left: 40 };
  const containerWidth = container.node().clientWidth;
  const width = containerWidth - margin.left - margin.right;
  const height = 320 - margin.top - margin.bottom;

  const tooltip = container.append("div").attr("class", "tooltip");

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const parseDate = d3.timeParse("%Y-%m-%d");
  const formatDate = d3.timeFormat("%b %Y");

  Promise.all([
    d3.csv("CPI.csv"),
    d3.csv("PPI cat.csv"),
    d3.csv("PPI dog.csv")
  ]).then(function ([cpi, catPpi, dogPpi]) {
    cpi.forEach(d => {
      d.date = parseDate(d.observation_date);
      d.value = +d.CUSR0000SS61031;
    });

    catPpi.forEach(d => {
      d.date = parseDate(d.observation_date);
      d.value = +d.PCU3111113111114;
    });

    dogPpi.forEach(d => {
      d.date = parseDate(d.observation_date);
      d.value = +d.PCU3111113111111;
    });

    const startDate = new Date(2002, 0, 1);
    const endDate = new Date(2024, 11, 31);

    cpi = cpi.filter(d => d.date >= startDate && d.date <= endDate);
    catPpi = catPpi.filter(d => d.date >= startDate && d.date <= endDate);
    dogPpi = dogPpi.filter(d => d.date >= startDate && d.date <= endDate);

    const bisectDate = d3.bisector(d => d.date).left;

    function nearestPoint(data, hoveredDate) {
      const i = bisectDate(data, hoveredDate, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      if (!d0) return d1;
      if (!d1) return d0;
      return hoveredDate - d0.date > d1.date - hoveredDate ? d1 : d0;
    }

    const centerY = height / 2;
    const catX = width * 0.3;
    const dogX = width * 0.7;

    const radiusScale = d3.scaleSqrt()
      .domain([0, 80])
      .range([25, 80]);

    svg.append("text")
      .attr("x", catX)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .text("Cat gap");

    svg.append("text")
      .attr("x", dogX)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .text("Dog gap");

    const catCircle = svg.append("circle")
      .attr("cx", catX)
      .attr("cy", centerY)
      .attr("r", 40)
      .attr("fill", "red")
      .attr("opacity", 0.7);

    const dogCircle = svg.append("circle")
      .attr("cx", dogX)
      .attr("cy", centerY)
      .attr("r", 40)
      .attr("fill", "green")
      .attr("opacity", 0.7);

    function updateCircles(date) {
      const cpiPoint = nearestPoint(cpi, date);
      const catPoint = nearestPoint(catPpi, date);
      const dogPoint = nearestPoint(dogPpi, date);

      const catDiff = Math.abs(cpiPoint.value - catPoint.value);
      const dogDiff = Math.abs(cpiPoint.value - dogPoint.value);

      catCircle
        .transition()
        .duration(120)
        .attr("r", radiusScale(catDiff));

      dogCircle
        .transition()
        .duration(120)
        .attr("r", radiusScale(dogDiff));

      tooltip
        .style("visibility", "visible")
        .html(
          `<strong>${formatDate(cpiPoint.date)}</strong><br>
           Cat gap: ${catDiff.toFixed(2)}<br>
           Dog gap: ${dogDiff.toFixed(2)}`
        );
    }

    function resetCircles() {
      catCircle.transition().duration(120).attr("r", 40);
      dogCircle.transition().duration(120).attr("r", 40);
      tooltip.style("visibility", "hidden");
    }

    dispatcher.on("dateHover.chart4", function (date) {
      updateCircles(date);
    });

    dispatcher.on("dateOut.chart4", function () {
      resetCircles();
    });
  });
})();
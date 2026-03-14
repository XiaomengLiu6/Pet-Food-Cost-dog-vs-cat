(function () {
  const dispatcher = window.chartDispatcher;
  const container = d3.select("#chart2");

  const margin = { top: 50, right: 50, bottom: 50, left: 60 };
  const containerWidth = container.node().clientWidth;
  const width = containerWidth - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

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
    d3.csv("PPI cat.csv")
  ]).then(function ([cpi, ppi]) {
    cpi.forEach(d => {
      d.date = parseDate(d.observation_date);
      d.value = +d.CUSR0000SS61031;
    });

    ppi.forEach(d => {
      d.date = parseDate(d.observation_date);
      d.value = +d.PCU3111113111114;
    });

    const startDate = new Date(2002, 0, 1);
    const endDate = new Date(2024, 11, 31);

    cpi = cpi.filter(d => d.date >= startDate && d.date <= endDate);
    ppi = ppi.filter(d => d.date >= startDate && d.date <= endDate);

    const allData = cpi.concat(ppi);

    const x = d3.scaleTime()
      .domain([startDate, endDate])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(allData, d => d.value)])
      .nice()
      .range([height, 0]);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Year");
    svg.append("g").call(d3.axisLeft(y));
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Price Index");
    const line = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.value));

    svg.append("path")
      .datum(cpi)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);

    svg.append("path")
      .datum(ppi)
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 2)
      .attr("d", line);

    const hoverLine = svg.append("line")
      .attr("stroke", "#999")
      .attr("stroke-dasharray", "4 4")
      .attr("y1", 0)
      .attr("y2", height)
      .style("opacity", 0);

    const focusCPI = svg.append("circle")
      .attr("r", 5)
      .attr("fill", "steelblue")
      .style("opacity", 0);

    const focusPPI = svg.append("circle")
      .attr("r", 5)
      .attr("fill", "red")
      .style("opacity", 0);

    const bisectDate = d3.bisector(d => d.date).left;

    function nearestPoint(data, hoveredDate) {
      const i = bisectDate(data, hoveredDate, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      if (!d0) return d1;
      if (!d1) return d0;
      return hoveredDate - d0.date > d1.date - hoveredDate ? d1 : d0;
    }

    function renderHover(date) {
      const cpiPoint = nearestPoint(cpi, date);
      const ppiPoint = nearestPoint(ppi, date);

      hoverLine
        .style("opacity", 1)
        .attr("x1", x(cpiPoint.date))
        .attr("x2", x(cpiPoint.date));

      focusCPI
        .style("opacity", 1)
        .attr("cx", x(cpiPoint.date))
        .attr("cy", y(cpiPoint.value));

      focusPPI
        .style("opacity", 1)
        .attr("cx", x(ppiPoint.date))
        .attr("cy", y(ppiPoint.value));

      tooltip
        .style("visibility", "visible")
        .html(
          `<strong>${formatDate(cpiPoint.date)}</strong><br>
           Cat PPI: ${ppiPoint.value.toFixed(2)}<br>
           CPI: ${cpiPoint.value.toFixed(2)}`
        );
    }

    function clearHover() {
      tooltip.style("visibility", "hidden");
      hoverLine.style("opacity", 0);
      focusCPI.style("opacity", 0);
      focusPPI.style("opacity", 0);
    }

    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event, this);
        const hoveredDate = x.invert(mx);
        dispatcher.call("dateHover", null, hoveredDate);
      })
      .on("mouseout", function () {
        dispatcher.call("dateOut");
      });

    dispatcher.on("dateHover.chart2", function (date) {
      renderHover(date);
    });

    dispatcher.on("dateOut.chart2", function () {
      clearHover();
    });
  });
})();
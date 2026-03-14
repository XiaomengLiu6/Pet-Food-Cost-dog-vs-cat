(function () {
const container = d3.select("#chart1");

// margins and size
const margin = { top: 50, right: 50, bottom: 50, left: 60 };

const svgWidth = container.node().clientWidth;
const svgHeight = 340;

const width = svgWidth - margin.left - margin.right;
const height = svgHeight - margin.top - margin.bottom;

// create tooltip
const tooltip = container
  .append("div")
  .attr("class", "tooltip");

// create svg
const svg = container
  .append("svg")
  .attr("width", svgWidth)
  .attr("height", svgHeight)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

const parseDate = d3.timeParse("%Y-%m-%d");
const formatDate = d3.timeFormat("%b %Y");

// load datasets
Promise.all([
  d3.csv("CPI.csv"),
  d3.csv("PPI dog and cat.csv")
]).then(function ([cpi, ppi]) {
  // convert data
  cpi.forEach(d => {
    d.date = parseDate(d.observation_date);
    d.value = +d.CUSR0000SS61031;
  });

  ppi.forEach(d => {
    d.date = parseDate(d.observation_date);
    d.value = +d.PCU311111311111;
  });

  const startDate = new Date(2002, 0, 1);
  const endDate = new Date(2024, 11, 31);

  cpi = cpi.filter(d => d.date >= startDate && d.date <= endDate);
  ppi = ppi.filter(d => d.date >= startDate && d.date <= endDate);

  const allData = cpi.concat(ppi);

  // x scale
  const x = d3.scaleTime()
    .domain([startDate, endDate])
    .range([0, width]);

  // y scale
  const y = d3.scaleLinear()
    .domain([0, d3.max(allData, d => d.value)])
    .nice()
    .range([height, 0]);

  // x axis
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Year");

  // annotation text
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("fill", "gray")
    .text("Move your mouse for a specific date and see the values.");

  // y axis
  svg.append("g")
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Price Index");

  // line generator
  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value));

  // PPI line
  svg.append("path")
    .datum(ppi)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("d", line);
  // CPI line
  svg.append("path")
    .datum(cpi)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

  // static legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 120}, 10)`);

  // PPI legend item
  legend.append("line")
    .attr("x1", 0)
    .attr("x2", 25)
    .attr("y1", 20)
    .attr("y2", 20)
    .attr("stroke", "red")
    .attr("stroke-width", 2);

  legend.append("text")
    .attr("x", 32)
    .attr("y", 24)
    .style("font-size", "12px")
    .text("PPI");

  // CPI legend item
  legend.append("line")
    .attr("x1", 0)
    .attr("x2", 25)
    .attr("y1", 0)
    .attr("y2", 0)
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2);

  legend.append("text")
    .attr("x", 32)
    .attr("y", 4)
    .style("font-size", "12px")
    .text("CPI");

  // hover line
  const hoverLine = svg.append("line")
    .attr("stroke", "#999")
    .attr("stroke-dasharray", "4 4")
    .attr("y1", 0)
    .attr("y2", height)
    .style("opacity", 0);

  // focus dots
  const focusCPI = svg.append("circle")
    .attr("r", 5)
    .attr("fill", "steelblue")
    .style("opacity", 0);

  const focusPPI = svg.append("circle")
    .attr("r", 5)
    .attr("fill", "red")
    .style("opacity", 0);

  const bisectDate = d3.bisector(d => d.date).left;

  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("mouseover", function () {
      tooltip.style("visibility", "visible");
      hoverLine.style("opacity", 1);
      focusCPI.style("opacity", 1);
      focusPPI.style("opacity", 1);
    })
    .on("mousemove", function (event) {
      const [mx] = d3.pointer(event, this);
      const hoveredDate = x.invert(mx);

      const iCPI = bisectDate(cpi, hoveredDate, 1);
      const d0CPI = cpi[iCPI - 1];
      const d1CPI = cpi[iCPI];
      const cpiPoint = !d0CPI
        ? d1CPI
        : !d1CPI
        ? d0CPI
        : (hoveredDate - d0CPI.date > d1CPI.date - hoveredDate ? d1CPI : d0CPI);

      const iPPI = bisectDate(ppi, hoveredDate, 1);
      const d0PPI = ppi[iPPI - 1];
      const d1PPI = ppi[iPPI];
      const ppiPoint = !d0PPI
        ? d1PPI
        : !d1PPI
        ? d0PPI
        : (hoveredDate - d0PPI.date > d1PPI.date - hoveredDate ? d1PPI : d0PPI);

      const xPos = x(cpiPoint.date);

      hoverLine
        .attr("x1", xPos)
        .attr("x2", xPos);

      focusCPI
        .attr("cx", xPos)
        .attr("cy", y(cpiPoint.value));

      focusPPI
        .attr("cx", xPos)
        .attr("cy", y(ppiPoint.value));

      tooltip
        .html(
          `<strong>${formatDate(cpiPoint.date)}</strong><br>
           PPI: ${ppiPoint.value.toFixed(2)}<br>
           CPI: ${cpiPoint.value.toFixed(2)}`
        )
        .style("visibility", "visible");

      const [cx, cy] = d3.pointer(event, container.node());

      const tooltipNode = tooltip.node();
      const tooltipWidth = tooltipNode.offsetWidth;
      const tooltipHeight = tooltipNode.offsetHeight;
      const containerWidth = container.node().clientWidth;

      let left = cx + 15;
      let top = cy - tooltipHeight - 8;

      if (left + tooltipWidth > containerWidth) {
        left = cx - tooltipWidth - 15;
      }

      if (left < 0) {
        left = 10;
      }

      const minTop = margin.top + 5;
      const maxTop = margin.top + height - tooltipHeight - 5;

      if (top < minTop) {
        top = minTop;
      }

      if (top > maxTop) {
        top = maxTop;
      }

      tooltip
        .style("left", left + "px")
        .style("top", top + "px");
    })
    .on("mouseout", function () {
      tooltip.style("visibility", "hidden");
      hoverLine.style("opacity", 0);
      focusCPI.style("opacity", 0);
      focusPPI.style("opacity", 0);
    });
});
})();
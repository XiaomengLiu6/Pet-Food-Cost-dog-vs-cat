(function () {

  const container = d3.select("#chart5");

  const margin = { top: 55, right: 90, bottom: 50, left: 100 };
  const containerWidth = container.node().clientWidth || 800;

  const width = containerWidth - margin.left - margin.right;
  const height = 220 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const parseDate = d3.timeParse("%Y-%m-%d");

  Promise.all([
    d3.csv("PPI dog.csv"),
    d3.csv("PPI cat.csv")
  ]).then(function ([dogPPI, catPPI]) {

    dogPPI.forEach(d => {
      d.date = parseDate(d.observation_date);
      d.value = +d.PCU3111113111111;
      d.year = d.date.getFullYear();
    });

    catPPI.forEach(d => {
      d.date = parseDate(d.observation_date);
      d.value = +d.PCU3111113111114;
      d.year = d.date.getFullYear();
    });

    const startDate = new Date(2002, 0, 1);
    const endDate = new Date(2024, 11, 31);

    dogPPI = dogPPI.filter(d => d.date >= startDate && d.date <= endDate);
    catPPI = catPPI.filter(d => d.date >= startDate && d.date <= endDate);

    // yearly averages
    const dogYearly = Array.from(
      d3.rollup(
        dogPPI,
        v => d3.mean(v, d => d.value),
        d => d.year
      ),
      ([year, value]) => ({ year: +year, dog_ppi: value })
    ).sort((a, b) => d3.ascending(a.year, b.year));

    const catYearly = Array.from(
      d3.rollup(
        catPPI,
        v => d3.mean(v, d => d.value),
        d => d.year
      ),
      ([year, value]) => ({ year: +year, cat_ppi: value })
    ).sort((a, b) => d3.ascending(a.year, b.year));

    const catMap = new Map(catYearly.map(d => [d.year, d.cat_ppi]));

    const combinedData = dogYearly.map(d => ({
      year: d.year,
      dog_ppi: d.dog_ppi,
      cat_ppi: catMap.get(d.year)
    })).filter(d => d.cat_ppi != null);

    const startDog = combinedData[0].dog_ppi;
    const startCat = combinedData[0].cat_ppi;

    combinedData.forEach(d => {
      d.dog_change = d.dog_ppi - startDog;
      d.cat_change = d.cat_ppi - startCat;
    });

    const maxChange = d3.max(combinedData, d =>
      Math.max(d.dog_change, d.cat_change, 0)
    );

    const x = d3.scaleLinear()
      .domain([0, maxChange])
      .range([0, width])
      .nice();

    const y = d3.scaleBand()
      .domain(["Dog food PPI", "Cat food PPI"])
      .range([0, height])
      .padding(0.35);

    // title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "600")
      .text("Cumulative Change in PPI Since Start Year");

    // axes
    svg.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .select(".domain")
      .remove();

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5));

    // baseline
    svg.append("line")
      .attr("x1", x(0))
      .attr("x2", x(0))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#444");

    // bars
    const dogBar = svg.append("rect")
      .attr("y", y("Dog food PPI"))
      .attr("height", y.bandwidth())
      .attr("x", x(0))
      .attr("width", 0)
      .attr("fill", "red");

    const catBar = svg.append("rect")
      .attr("y", y("Cat food PPI"))
      .attr("height", y.bandwidth())
      .attr("x", x(0))
      .attr("width", 0)
      .attr("fill", "orange");

    const dogLabel = svg.append("text")
      .attr("y", y("Dog food PPI") + y.bandwidth()/2)
      .attr("dy", "0.35em");

    const catLabel = svg.append("text")
      .attr("y", y("Cat food PPI") + y.bandwidth()/2)
      .attr("dy", "0.35em");

    const yearLabel = svg.append("text")
      .attr("x", width)
      .attr("y", height + 35)
      .attr("text-anchor", "end");

    function updateChart(d) {

      const dogWidth = d.dog_change > 0 ? x(d.dog_change) : 0;
      const catWidth = d.cat_change > 0 ? x(d.cat_change) : 0;

      dogBar.transition().duration(600).attr("width", dogWidth);
      catBar.transition().duration(600).attr("width", catWidth);

      dogLabel
        .transition().duration(600)
        .attr("x", dogWidth + 8)
        .text(d.dog_change.toFixed(2));

      catLabel
        .transition().duration(600)
        .attr("x", catWidth + 8)
        .text(d.cat_change.toFixed(2));

      yearLabel.text("Year: " + d.year);
    }

let index = 0;
let playing = true;
let timer;

function startTimer(delay = 1000) {

  timer = d3.interval(() => {

    if (!playing) return;

    updateChart(combinedData[index]);

    // if last year reached
    if (index === combinedData.length - 1) {

      timer.stop(); // stop normal loop

      setTimeout(() => {
        index = 0;
        if (playing) startTimer(1000);
      }, 2000); // pause 2 seconds

    } else {
      index++;
    }

  }, delay);

}

// start animation
startTimer();

    // button control
    d3.select("#chart5-toggle").on("click", function () {

      playing = !playing;

      d3.select(this).text(
        playing ? "Pause" : "Start"
      );

    });

  });

})();
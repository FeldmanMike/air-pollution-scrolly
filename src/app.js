import scrollama from 'scrollama';
import {transition} from 'd3-transition';
import {zoom, transform, zoomIdentity} from 'd3-zoom';
import {map} from 'd3-collection';
import {format} from 'd3-format';
import {legendColor} from 'd3-svg-legend';

// from https://github.com/jbkunst/d3-waffle/blob/master/d3-waffle.js
import {csv, json} from 'd3-fetch';
import {select, pointer} from 'd3-selection';
import {bin} from 'd3-array';
import {geoPath, geoAlbersUsa} from 'd3-geo';
import {extent} from 'd3-array';
import {scaleThreshold, scaleOrdinal} from 'd3-scale';
import {
  interpolateViridis,
  schemeBlues,
  schemeYlGnBu,
} from 'd3-scale-chromatic';
import './main.css';

// Define containers to be used for scrolly graphics
// from https://pudding.cool/process/introducing-scrollama/
var container = select('#scroll1');
var container2 = select('#scroll2');

var graphic = container.select('.scroll__graphic');
var graphic2 = container2.select('.scroll__graphic2');

var chart = graphic.select('#vis1');
var waffChart = graphic.select('#waffle');
var text = container.select('.scroll__text');
var step = text.selectAll('.step');

var chart2 = graphic2.select('#vis2');
var text2 = container2.select('.scroll__text2');
var step2 = text2.selectAll('.step');

var scroller = scrollama();
var scroller2 = scrollama();

// Define constants used in generation of maps and waffle plot
const yearOne = 2001;
const yearLast = 2014;
const projection = geoAlbersUsa();
const path = geoPath().projection(projection);
const widthSquares = 25;
const heightSquares = 20;
const squareSize = 16;
const squareValue = 0;
const gap = 1;

// Years looped through in first scrolly map
var years = [
  2001,
  2001,
  2002,
  2003,
  2004,
  2005,
  2006,
  2007,
  2008,
  2009,
  2010,
  2011,
  2012,
  2013,
  2014,
  2014,
];

// Data and color scale
const thresholds = [3, 6, 9, 12];
const colorScale = scaleThreshold()
  .domain(thresholds)
  .range(schemeYlGnBu[5]);

// Legend
var colorLegend = legendColor()
  .scale(colorScale)
  .labels(['0 - 3', '3 - 6', '6 - 9', '9 - 12', '12+'])
  .title('Concentration (micrograms per cubic meter)')
  .titleWidth(150);

Promise.all([
  json('./data/us_air_pollution.json'),
  json('./data/us-counties.json'),
  json('./data/us-states.json'),
  json('./data/us_air_deaths.json'),
  json('./data/cumul_air_deaths.json'),
  json('./data/waffle_boxes.json'),
  json('./data/viz_boxes.json'),
  json('./data/viz_deaths.json'),
  json('./data/state_mapping.json'),
]).then(files => fullMapVis(files));

// resize function to set dimensions on load and on page resize
function handleResize() {
  // 1. update height of step elements for breathing room between steps
  var stepHeight = Math.floor(window.innerHeight * 0.4);
  var stepWidth = Math.floor(window.innerWidth * 0.1);
  step.style('height', stepHeight + 'px');
  step.style('width', stepWidth + 'px');

  // 2. update height of graphic element
  var bodyWidth = select('body').node().offsetWidth;

  graphic.style('height', window.innerHeight + 'px');

  // 3. update width of chart by subtracting from text width
  var chartMargin = 32;
  var textWidth = text.node().offsetWidth;
  var chartWidth = graphic.node().offsetWidth - textWidth - chartMargin;

  // make the height 1/2 of viewport
  var chartHeight = Math.floor(window.innerHeight / 2);

  chart.style('width', chartWidth + 'px').style('height', chartHeight + 'px');

  // 4. tell scrollama to update new element dimensions
  scroller.resize();
}

// scrollama event handlers
function handleStepEnter(response) {
  // fade in current step
  step.classed('is-active', function(d, i) {
    return i === response.index;
  });

  // update map fill and title based on year of current step
  chart
    .selectAll('path')
    .data(window.globCounties.features)
    .transition()
    .duration(200)
    .attr('fill', d =>
      window.globAirData[years[response.index]][
        +(d.properties.STATE + d.properties.COUNTY)
      ] < 0
        ? '#d3d3d3'
        : colorScale(
            window.globAirData[years[response.index]][
              +(d.properties.STATE + d.properties.COUNTY)
            ],
          ),
    )
    .select('title')
    .text(
      d => `${d.properties.NAME} County, ${
        window.globStateMap[d.properties.STATE]
      }
${
  window.globAirData[years[response.index]][
    +(d.properties.STATE + d.properties.COUNTY)
  ]
}`,
    );

  chart.select('.map-year').text(years[response.index]);

  // update waffle chart and title based on year of current step
  if (years[response.index] === yearOne) {
    waffChart
      .select('.waffle-title')
      .text('in ' + years[response.index].toString() + ', an estimated');
  } else {
    waffChart
      .select('.waffle-title')
      .text(
        "each year from '" +
          yearOne.toString().substr(2, 2) +
          "-'" +
          years[response.index].toString().substr(2, 2) +
          ', an estimated',
      );
  }

  waffChart
    .select('.waffle-deaths')
    .text(
      format(',')(window.numDeaths[years[response.index]]).toString() +
        ' deaths',
    );

  waffChart
    .selectAll('g')
    .selectAll('rect')
    .data(window.numBoxes[response.index])
    .exit()
    .transition()
    .duration(150)
    .style('opacity', 0)
    .remove();

  waffChart
    .selectAll('g')
    .selectAll('rect')
    .data(window.numBoxes[response.index])
    .enter()
    .append('rect')
    .merge(waffChart)
    .transition()
    .duration(150)
    .attr('width', squareSize)
    .attr('height', squareSize)
    .attr('fill', '#8B0000')
    .attr('x', function(d, i) {
      //group n squares for column
      var col = Math.floor(i / heightSquares);
      return col * squareSize + col * gap;
    })
    .attr('y', function(d, i) {
      var row = i % heightSquares;
      return heightSquares * squareSize - (row * squareSize + row * gap);
    })
    .attr('transform', 'translate(0, 125)');

  waffChart;
}

// kick-off code to run once on load
function init() {
  // 1. call a resize on load to update width/height/position of elements
  handleResize();

  // 2. setup the scrollama instance
  // 3. bind scrollama event handlers
  scroller
    .setup({
      container: '#scroll1', // our outermost scrollytelling element
      graphic: '.scroll__graphic', // the graphic
      text: '.scroll__text', // the step container
      step: '.scroll__text .step', // the step elements
      offset: 0.5, // set the trigger to be 1/2 way down screen
      debug: false, // display the trigger offset for testing
    })
    .onStepEnter(handleStepEnter);

  // setup resize event
  window.addEventListener('resize', handleResize);
}

function fullMapVis(files) {
  const width = 920;
  const height = 600;
  const data = files[0];
  const counties = files[1];
  const states = files[2];
  const cumul_deaths = files[4];
  const boxes = files[5];
  const vizDeaths = files[7];
  const stateMap = files[8];

  window.globAirData = data;
  window.globCounties = counties;
  window.globStates = states;
  window.globStateMap = stateMap;

  // Map and projection
  const projection = geoAlbersUsa();
  const path = geoPath().projection(projection);

  // Create svg
  const svg = select('#vis1')
    .append('svg')
    .attr('height', height)
    .attr('width', width);
  // .attr('transform', 'translate(180, 0)');

  svg
    .append('g')
    .selectAll('path')
    .data(counties.features)
    .enter()
    .append('path')
    .attr('class', 'counties')
    .attr('fill', d =>
      data[yearOne][+(d.properties.STATE + d.properties.COUNTY)] < 0
        ? '#d3d3d3'
        : colorScale(
            data[yearOne][+(d.properties.STATE + d.properties.COUNTY)],
          ),
    )
    .attr('d', path)
    .attr('transform', 'translate(-80, 50) scale(0.9)')
    .append('title')
    .text(
      d => `${d.properties.NAME} County, ${
        window.globStateMap[d.properties.STATE]
      }
${data[yearOne][+(d.properties.STATE + d.properties.COUNTY)]}`,
    );

  svg
    .append('g')
    .selectAll('path')
    .data(states.features)
    .enter()
    .append('path')
    .attr('fill', 'none')
    .attr('class', 'states')
    .attr('stroke', '#646464')
    .attr('stroke-linejoin', 'round')
    .attr('d', path)
    .attr('transform', 'translate(-80, 50) scale(0.9)');

  // Title and subtitle
  svg
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('y', 20)
    .attr('x', 380)
    .text('Fine particulate (PM2.5) concentrations by county in...')
    .style('font-size', '20px')
    .attr('class', 'map-title');

  svg
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('y', 50)
    .attr('x', 380)
    .text(yearOne)
    .style('font-size', '28px')
    .style('font-weight', 800)
    .attr('class', 'map-year');

  svg
    .append('text')
    .attr('text-anchor', 'start')
    .attr('y', 540)
    .attr('x', 0)
    .text('Source: Centers for Disease Control and Prevention')
    .style('font-size', '14px')
    .style('fill', '#808080');

  svg
    .append('text')
    .attr('text-anchor', 'start')
    .attr('y', 557)
    .attr('x', 0)
    .text('Death estimates only available for 2001-2014')
    .style('font-size', '14px')
    .style('fill', '#808080');

  svg
    .append('g')
    .call(colorLegend)
    .attr('transform', 'translate(630, 370)');

  function rectArray(data) {
    var boxNums = new Array();
    for (let i = 0; i < 16; i++) {
      boxNums.push(
        Array(data[years[i]] + 1)
          .join(1)
          .split('')
          .map(function() {
            return {units: data[years[i]], groupIndex: i};
          }),
      );
    }
    return boxNums;
  }

  var boxData = rectArray(boxes);
  window.numBoxes = boxData;
  window.numDeaths = cumul_deaths;

  const width_waf = squareSize * widthSquares + widthSquares * gap + 200;
  const height_waf = squareSize * heightSquares + heightSquares * gap + 175;

  var waffle = select('#waffle')
    .append('svg')
    .attr('width', width_waf)
    .attr('height', height_waf);

  waffle
    .append('g')
    .selectAll('div')
    .data(boxData[0])
    .enter()
    .append('rect')
    .attr('width', squareSize)
    .attr('height', squareSize)
    .attr('fill', '#8B0000')
    .attr('x', function(d, i) {
      //group n squares for column
      var col = Math.floor(i / heightSquares);
      return col * squareSize + col * gap;
    })
    .attr('y', function(d, i) {
      var row = i % heightSquares;
      return heightSquares * squareSize - (row * squareSize + row * gap);
    })
    .attr('transform', 'translate(0, 125)');

  waffle
    .selectAll('g')
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('y', 15)
    .attr('x', 230)
    .text('If PM2.5 levels were 25% lower')
    .style('font-size', '20px');

  waffle
    .selectAll('g')
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('y', 40)
    .attr('x', 230)
    .text('in ' + yearOne.toString() + ', an estimated')
    .style('font-size', '20px')
    .attr('class', 'waffle-title');

  waffle
    .selectAll('g')
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('y', 70)
    .attr('x', 230)
    .text(format(',')(vizDeaths[yearOne]).toString() + ' deaths')
    .style('font-size', '28px')
    .attr('class', 'waffle-deaths')
    .style('font-weight', 800);

  waffle
    .selectAll('g')
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('y', 95)
    .attr('x', 230)
    .text('could have been avoided')
    .style('font-size', '20px');

  waffle
    .selectAll('g')
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('y', 115)
    .attr('x', 230)
    .text('(each box below represents 1,000 deaths)')
    .style('font-size', '13px');

  init();
  mapZoom();
}

// needed to copy scrollama functions below; couldn't figure out how to
// use just one set of functions for the two sets of scrolly animations
// on the page

// resize function to set dimensions on load and on page resize
function handleResize2() {
  // 1. update height of step elements for breathing room between steps
  var stepHeight = Math.floor(window.innerHeight * 0.8);
  var stepWidth = Math.floor(window.innerWidth * 0.16);
  step2.style('height', stepHeight + 'px');
  step2.style('width', stepWidth + 'px');

  // 2. update height of graphic element
  var bodyWidth = select('body').node().offsetWidth;

  graphic2.style('height', window.innerHeight + 'px');

  // 3. update width of chart by subtracting from text width
  var chartMargin = 32;
  var textWidth = text.node().offsetWidth;
  var chartWidth = graphic.node().offsetWidth - textWidth - chartMargin;
  // make the height 1/2 of viewport
  var chartHeight = Math.floor(window.innerHeight / 2);

  chart2.style('width', chartWidth + 'px').style('height', chartHeight + 'px');

  // 4. tell scrollama to update new element dimensions
  scroller2.resize();
}

// scrollama event handlers
function handleStepEnter2(response) {
  // x is leftmost point, y is topmost point
  // bounding box for US map is:
  // { x: 31.287342071533203, y: 9.64207649230957,
  // width: 835.5782470703125, height: 487.91693115234375 }

  // how to interpret bounding boxes below:
  // const [[left, top], [right, bottom]]

  // define bounding boxes of parts of US map to zoom in on
  var boundBoxes = new Array();
  const us = [
    [52, 40],
    [855, 485],
  ];

  const cali = [
    [32, 140],
    [250, 325],
  ];

  const midwest = [
    [600, 125],
    [720, 270],
  ];

  const southeast = [
    [600, 285],
    [720, 440],
  ];

  const hawaii = [
    [260, 425],
    [375, 495],
  ];

  // add bounding boxes to list in the order I want to call them
  boundBoxes.push(us);
  boundBoxes.push(cali);
  boundBoxes.push(midwest);
  boundBoxes.push(southeast);
  boundBoxes.push(hawaii);
  boundBoxes.push(us);

  // zoom into a region of the map based on value of current step
  const [[x0, y0], [x1, y1]] = boundBoxes[response.index];

  const width = 1000;
  const height = 500;

  var transform = zoomIdentity
    .translate(width / 2, height / 2)
    .scale(0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height))
    .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);

  step2.classed('is-active', function(d, i) {
    return i === response.index;
  });

  chart2
    .selectAll('path')
    .transition()
    .duration(800)
    .attr('transform', transform);
}

// kick-off code to run once on load
function init2() {
  // 1. call a resize on load to update width/height/position of elements
  handleResize2();

  // 2. setup the scrollama instance
  // 3. bind scrollama event handlers (this can be chained like below)
  scroller2
    .setup({
      container: '#scroll2', // our outermost scrollytelling element
      graphic: '.scroll__graphic2', // the graphic
      text: '.scroll__text2', // the step container
      step: '.scroll__text2 .step', // the step elements
      offset: 0.5, // set the trigger to be 1/2 way down screen
      debug: false, // display the trigger offset for testing
    })
    .onStepEnter(handleStepEnter2);

  // setup resize event
  window.addEventListener('resize', handleResize2);
}

// create map that will be zoomed in on
function mapZoom() {
  const width = 1000;
  const height = 500;

  const svg = select('#vis2')
    .append('svg')
    .attr('height', height)
    .attr('width', width)
    .attr('transform', 'translate(60, 0)');

  svg
    .append('g')
    .selectAll('path')
    .data(window.globCounties.features)
    .enter()
    .append('path')
    .attr('class', 'big-map')
    .attr('fill', d =>
      window.globAirData[2016][+(d.properties.STATE + d.properties.COUNTY)] < 0
        ? '#d3d3d3'
        : colorScale(
            window.globAirData[2016][
              +(d.properties.STATE + d.properties.COUNTY)
            ],
          ),
    )
    .attr('d', path)
    .append('title')
    .text(
      d => `${d.properties.NAME} County, ${
        window.globStateMap[d.properties.STATE]
      }
${window.globAirData[2016][+(d.properties.STATE + d.properties.COUNTY)]}`,
    );

  svg
    .append('g')
    .selectAll('path')
    .data(window.globStates.features)
    .enter()
    .append('path')
    .attr('class', 'big-map')
    .attr('fill', 'none')
    .attr('stroke', '#646464')
    .attr('stroke-linejoin', 'round')
    .attr('d', path);

  svg
    .append('rect')
    .attr('y', 0)
    .attr('x', 8)
    .attr('height', 175)
    .attr('width', 130)
    .attr('opacity', 0.55)
    .attr('fill', '#dbdbdb');

  svg
    .append('rect')
    .attr('y', -10)
    .attr('x', 140)
    .attr('height', 50)
    .attr('width', 690)
    .attr('opacity', 0.7)
    .attr('fill', '#dbdbdb');

  svg
    .append('rect')
    .attr('y', 462)
    .attr('x', 2)
    .attr('height', 38)
    .attr('width', 336)
    .attr('opacity', 0.55)
    .attr('fill', '#dbdbdb');

  svg
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('y', 30)
    .attr('x', 485)
    .text('A brief tour: PM2.5 concentrations across the US (2016)')
    .style('font-size', '26px')
    .attr('class', 'map-title')
    .style('font-weight', 800);

  svg
    .append('text')
    .attr('text-anchor', 'start')
    .attr('y', 479)
    .attr('x', 8)
    .text('Source: Centers for Disease Control and Prevention')
    .style('font-size', '14px')
    .style('fill', '#808080');

  svg
    .append('text')
    .attr('text-anchor', 'start')
    .attr('y', 494)
    .attr('x', 8)
    .text('Note: 2016 is the latest year of available data')
    .style('font-size', '14px')
    .style('fill', '#808080');

  svg
    .append('g')
    .call(colorLegend)
    .attr('transform', 'translate(15, 20)');

  init2();
}

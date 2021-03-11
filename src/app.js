// TODO - wrangle pollution data so it's in JSON form:
// keys are years, values are key/value pairs with countyFIPS & pollution value
// (then I can do a global import)

// then try and get scrolling + filtering to work (it should)

// if the data you are going to import is small, then you can import it using es6 import
// (I like to use use screaming snake case for imported json)

// import {myExampleUtil} from './utils';
import scrollama from 'scrollama';
import {transition} from 'd3-transition';
import {zoom, transform, zoomIdentity} from 'd3-zoom';
// import {onStepEnter, onContainerEnter, onContainerExit} from 'scrollama';
import {map} from 'd3-collection';

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

const yearOne = 2001;
const yearLast = 2014;
const projection = geoAlbersUsa();
const path = geoPath().projection(projection);
const widthSquares = 10;
const heightSquares = 14;
const squareSize = 25;
const squareValue = 0;
const gap = 1;

// var chart = d3waffle();

// console.log('graphic is...');
// console.log(graphic);

var scroller = scrollama();
var scroller2 = scrollama();

// console.log(scroller);

// Data and color scale
const thresholds = [3, 6, 9, 12];
const colorScale = scaleThreshold()
  .domain(thresholds)
  // .range(interpolateViridis[5]);
  .range(schemeYlGnBu[5]);

Promise.all([
  json('./data/us_air_pollution.json'),
  json('./data/us-counties.json'),
  json('./data/us-states.json'),
  json('./data/us_air_deaths.json'),
  json('./data/cumul_air_deaths.json'),
  json('./data/waffle_boxes.json'),
]).then(files => fullMapVis(files));

// resize function to set dimensions on load and on page resize
function handleResize() {
  // 1. update height of step elements for breathing room between steps
  var stepHeight = Math.floor(window.innerHeight * 0.5);
  step.style('height', stepHeight + 'px');

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
  var years = [2001, 2001, 2006, 2011, 2014, 2014];
  // response = { element, direction, index }
  // fade in current step
  step.classed('is-active', function(d, i) {
    return i === response.index;
  });
  // console.log('response index is...');
  // console.log(response.index);
  //
  // console.log(response.index + yearOne);
  // update graphic based on step

  // console.log('about to update chart...');
  // yearOne + response.index
  chart
    .selectAll('path')
    .data(window.globCounties.features)
    .transition()
    .duration(200)
    .attr('fill', d =>
      colorScale(
        window.globAirData[years[response.index]][
          +(d.properties.STATE + d.properties.COUNTY)
        ],
      ),
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
      // console.log('i is...');
      // console.log(i);
      return col * squareSize + col * gap;
    })
    .attr('y', function(d, i) {
      var row = i % heightSquares;
      return heightSquares * squareSize - (row * squareSize + row * gap);
    });

  waffChart;

  // console.log('chart updated!');
}

// kick-off code to run once on load
function init() {
  // 1. call a resize on load to update width/height/position of elements
  // setupStickyfill();
  handleResize();

  // 2. setup the scrollama instance
  // 3. bind scrollama event handlers (this can be chained like below)
  scroller
    .setup({
      container: '#scroll1', // our outermost scrollytelling element
      graphic: '.scroll__graphic', // the graphic
      text: '.scroll__text', // the step container
      step: '.scroll__text .step', // the step elements
      offset: 0.5, // set the trigger to be 1/2 way down screen
      debug: true, // display the trigger offset for testing
    })
    .onStepEnter(handleStepEnter);
  // .onContainerEnter(handleContainerEnter)
  // .onContainerExit(handleContainerExit);

  // setup resize event
  window.addEventListener('resize', handleResize);
}

// function updateMap() {}

function fullMapVis(files) {
  const width = 2000;
  const height = 500;
  const xDim = 'countyFIPS';
  const yDim = 'Value';
  const data = files[0];
  const counties = files[1];
  const states = files[2];
  const deaths = files[3];
  const cumul_deaths = files[4];
  const boxes = files[5];
  // const years = Object.keys(boxes);
  // const numBoxes = Object.values(boxes);
  // console.log('boxes are...');
  // console.log(boxes);

  window.globAirData = data;
  window.globCounties = counties;
  window.globStates = states;

  // Map and projection
  // console.log('past path!');
  const projection = geoAlbersUsa();
  const path = geoPath().projection(projection);

  // console.log('past projection!');
  // console.log('here are states!');
  // console.log(states);

  // console.log('past color scale!');
  // console.log(
  //   counties.features[0].properties.STATE +
  //     counties.features[0].properties.COUNTY,
  // );

  // Create svg
  const svg = select('#vis1')
    .append('svg')
    // .attr('viewBox', [0, 0, 975, 610]);
    .attr('height', height)
    .attr('width', width);

  console.log('here I am!');

  //Bind data and create one path per GeoJSON feature
  // used https://observablehq.com/@d3/choropleth
  svg
    .append('g')
    .selectAll('path')
    .data(counties.features)
    .enter()
    .append('path')
    .attr('class', 'big-map')
    .attr('fill', d =>
      colorScale(data[yearOne][+(d.properties.STATE + d.properties.COUNTY)]),
    )
    .attr('d', path);

  svg
    .append('g')
    .selectAll('path')
    .data(states.features)
    .enter()
    .append('path')
    .attr('class', 'big-map')
    .attr('fill', 'none')
    .attr('stroke', '#646464')
    .attr('stroke-linejoin', 'round')
    .attr('d', path);

  function rectArray(data) {
    var boxNums = new Array();
    for (let i = yearOne; i < yearLast + 1; i++) {
      console.log('data value is...');
      console.log(data[i]);
      boxNums.push(
        Array(data[i] + 1)
          .join(1)
          .split('')
          .map(function() {
            return {units: data[i], groupIndex: i};
          }),
      );
    }
    return boxNums;
  }

  var boxData = rectArray(boxes);
  window.numBoxes = boxData;
  console.log('box data is...');
  console.log(boxData);

  const width_waf = squareSize * widthSquares + widthSquares * gap + 200;
  const height_waf = squareSize * heightSquares + heightSquares * gap + 75;

  var waffle = select('#waffle')
    .append('svg')
    .attr('width', width_waf)
    .attr('height', height_waf)
    .attr('transform', 'translate(1000, -270)');

  console.log('boxes are...');
  console.log(boxes);

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
      // console.log('i is...');
      // console.log(i);
      return col * squareSize + col * gap;
    })
    .attr('y', function(d, i) {
      var row = i % heightSquares;
      return heightSquares * squareSize - (row * squareSize + row * gap);
    });
  init();
  mapZoom();
}

// resize function to set dimensions on load and on page resize
function handleResize2() {
  // 1. update height of step elements for breathing room between steps
  var stepHeight = Math.floor(window.innerHeight * 0.5);
  step2.style('height', stepHeight + 'px');

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
  // { x: 31.287342071533203, y: 9.64207649230957, width: 835.5782470703125, height: 487.91693115234375 }
  // CA: [[32, 170], [90, 400]]
  // response = { element, direction, index }
  // fade in current step
  // const [[left, top], [right, bottom]]
  // const [[x0, y0], [x1, y1]] = path.bounds(d);
  const [[x0, y0], [x1, y1]] = [
    [32, 170],
    [90, 400],
  ];
  const width = 2000;
  const height = 500;
  var transform = zoomIdentity
    .translate(width / 2, height / 2)
    .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
    .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);

  step2.classed('is-active', function(d, i) {
    return i === response.index;
  });

  // chart2.call(zoom)
  // .transition()
  // .duration(200)
  // .zoom.transform,
  // zoomIdentity,

  chart2.selectAll('path').attr('transform', transform);

  // chart2
  //   .selectAll('path')
  //   .data(window.globCounties.features)
  //   .transition()
  //   .duration(200)
  //   .attr('fill', d =>
  //     colorScale(
  //       window.globAirData[years[response.index]][
  //         +(d.properties.STATE + d.properties.COUNTY)
  //       ],
  //     ),
  //   );
}

// kick-off code to run once on load
function init2() {
  // 1. call a resize on load to update width/height/position of elements
  // setupStickyfill();
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
      debug: true, // display the trigger offset for testing
    })
    .onStepEnter(handleStepEnter2);
  // .onContainerEnter(handleContainerEnter)
  // .onContainerExit(handleContainerExit);

  // setup resize event
  window.addEventListener('resize', handleResize2);
}

function mapZoom() {
  const width = 2000;
  const height = 500;

  const svg = select('#vis2')
    .append('svg')
    .attr('height', height)
    .attr('width', width);

  svg
    .append('g')
    .selectAll('path')
    .data(window.globCounties.features)
    .enter()
    .append('path')
    .attr('class', 'big-map')
    .attr('fill', d =>
      colorScale(
        window.globAirData[2016][+(d.properties.STATE + d.properties.COUNTY)],
      ),
    )
    .attr('d', path);

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

  console.log('bounding box is...');
  console.log(svg.node().getBBox());
  init2();
}

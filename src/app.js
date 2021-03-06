// if the data you are going to import is small, then you can import it using es6 import
// (I like to use use screaming snake case for imported json)
// import MY_DATA from './app/data/example.json'

// import {myExampleUtil} from './utils';
import scrollama from 'scrollama';
// import {onStepEnter, onContainerEnter, onContainerExit} from 'scrollama';
import {map} from 'd3-collection';
import {csv, json} from 'd3-fetch';
import {select} from 'd3-selection';
import {bin} from 'd3-array';
import {geoPath, geoAlbersUsa} from 'd3-geo';
import {scaleThreshold} from 'd3-scale';
import {
  interpolateViridis,
  schemeBlues,
  schemeYlGnBu,
} from 'd3-scale-chromatic';
// this command imports the css file, if you remove it your css wont be applied!
import './main.css';

// from https://pudding.cool/process/introducing-scrollama/
var container = select('#scroll1');
var graphic = container.select('.scroll__graphic');
var chart = graphic.select('#vis1');
var text = container.select('.scroll__text');
var step = text.selectAll('.step');

console.log('graphic is...');
console.log(graphic);

var scroller = scrollama();

console.log(scroller);

// add try/except
Promise.all([
  csv('./data/cdc_air_pollution_counties.csv'),
  json('./data/us-counties.json'),
  json('./data/us-states.json'),
]).then(files => fullMapVis(files));

function createMapping(data, col1, col2) {
  const rv = new Map();
  for (let i = 0; i < data.length; i++) {
    rv.set(data[i][col1], +data[i][col2]);
  }
  return rv;
}

// resize function to set dimensions on load and on page resize
function handleResize() {
  // 1. update height of step elements for breathing room between steps
  var stepHeight = Math.floor(window.innerHeight * 0.75);
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
  // response = { element, direction, index }

  // fade in current step
  step.classed('is-active', function(d, i) {
    return i === response.index;
  });

  // update graphic based on step here
  // var stepData = $step.attr('data-step')
  // ...
}

// function handleContainerEnter(response) {
//   // response = { direction }
//
//   // sticky the graphic
//   graphic.classed('is-fixed', true);
//   graphic.classed('is-bottom', false);
// }
//
// function handleContainerExit(response) {
//   // response = { direction }
//
//   // un-sticky the graphic, and pin to top/bottom of container
//   graphic.classed('is-fixed', false);
//   graphic.classed('is-bottom', response.direction === 'down');
// }

// kick-off code to run once on load
function init() {
  // 1. call a resize on load to update width/height/position of elements
  // setupStickyfill();
  handleResize();

  console.log('Is the error before this?');

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

function fullMapVis(files) {
  const width = 2000;
  const height = 500;
  const xDim = 'countyFIPS';
  const yDim = 'Value';
  const thresholds = [3, 6, 9, 12];
  const data = files[0];
  const counties = files[1];
  const states = files[2];
  const data_16 = data.filter(({Year}) => Number(Year) === 2001);

  console.log('here is data!');
  console.log(data_16);
  console.log(counties.features);
  console.log('that was data!');
  var new_data = createMapping(data_16, xDim, yDim);

  console.log('this is new data!!!');
  console.log(new_data);

  // Map and projection
  console.log('past path!');
  const projection = geoAlbersUsa();
  const path = geoPath().projection(projection);

  console.log('past projection!');
  console.log('here are states!');
  console.log(states);

  // Data and color scale
  const colorScale = scaleThreshold()
    .domain(thresholds)
    // .range(interpolateViridis[5]);
    .range(schemeYlGnBu[5]);

  console.log('past color scale!');
  console.log(
    counties.features[0].properties.STATE +
      counties.features[0].properties.COUNTY,
  );

  // Create svg
  const svg = select('#vis1')
    .append('svg')
    // .attr('viewBox', [0, 0, 975, 610]);
    .attr('height', height)
    .attr('width', width);

  console.log('here I am!');

  //Bind data and create one path per GeoJSON feature
  // used https://observablehq.com/@d3/choropleth
  // TODO - add state map
  svg
    // .append('div')
    // .attr('class', 'testing')
    .append('g')
    .selectAll('path')
    .data(counties.features)
    .enter()
    .append('path')
    .attr('class', 'big-map')
    // .attr('class', 'scroll__graphic')
    .attr('fill', d =>
      colorScale(new_data.get(d.properties.STATE + d.properties.COUNTY)),
    )
    .attr('d', path);
  // .attr('transform', 'translate(0, 100)');

  svg
    // .append('div')
    // .attr('class', 'testing')
    .append('g')
    .selectAll('path')
    .data(states.features)
    .enter()
    .append('path')
    .attr('class', 'big-map')
    // .attr('class', 'scroll__graphic')
    .attr('fill', 'none')
    .attr('stroke', '#646464')
    .attr('stroke-linejoin', 'round')
    .attr('d', path);
  // .attr('transform', 'translate(0, 100)');
  init();
}

// init();

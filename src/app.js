// if the data you are going to import is small, then you can import it using es6 import
// (I like to use use screaming snake case for imported json)
// import MY_DATA from './app/data/example.json'

// import {myExampleUtil} from './utils';
import {map} from 'd3-collection';
import {csv, json} from 'd3-fetch';
import {select} from 'd3-selection';
import {bin} from 'd3-array';
import {geoPath, geoAlbersUsa} from 'd3-geo';
import {scaleThreshold} from 'd3-scale';
import {interpolateViridis, schemeBlues} from 'd3-scale-chromatic';
// this command imports the css file, if you remove it your css wont be applied!
import './main.css';

// add try/except
Promise.all([
  csv('./data/cdc_air_pollution_counties.csv'),
  json('./data/us-counties.json'),
]).then(files => fullMapVis(files));

function createMapping(data, col1, col2) {
  const rv = new Map();
  for (let i = 0; i < data.length; i++) {
    rv.set(data[i][col1], +data[i][col2]);
  }
  return rv;
}

function fullMapVis(files) {
  const width = 1000;
  const height = 500;
  const xDim = 'countyFIPS';
  const yDim = 'Value';
  const thresholds = [3, 6, 9, 12];
  const data = files[0];
  const counties = files[1];

  const data_16 = data.filter(({Year}) => Number(Year) === 2016);

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

  // Data and color scale
  const colorScale = scaleThreshold()
    .domain(thresholds)
    // .range(interpolateViridis[5]);
    .range(schemeBlues[5]);

  console.log('past color scale!');
  console.log(
    counties.features[0].properties.STATE +
      counties.features[0].properties.COUNTY,
  );

  // Create svg
  const svg = select('#app')
    .append('svg')
    // .attr('viewBox', [0, 0, 975, 610]);
    .attr('height', height)
    .attr('width', width);

  console.log('here I am!');

  //Bind data and create one path per GeoJSON feature
  // used https://observablehq.com/@d3/choropleth
  // TODO - add state map
  svg
    .append('g')
    .selectAll('path')
    .data(counties.features)
    .enter()
    .append('path')
    .attr('fill', d =>
      colorScale(new_data.get(d.properties.STATE + d.properties.COUNTY)),
    )
    .attr('d', path);
}

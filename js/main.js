// Lab 1
// script by Linzheng Yu

var map;
var minValue;
var dataStats = {};
var attributes;   // time fields array
var geojsonData;  // store raw data for search

//  Init 
document.addEventListener('DOMContentLoaded', function () {
  createMap();
});

// Create map 
function createMap() {
  map = L.map('map', {
    center: [39, -98],
    zoom: 4,
    zoomControl: true
  });

  // Basemap 
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
  }).addTo(map);

  // add scale bar
  L.control.scale({ position: 'bottomleft', imperial: true, metric: true }).addTo(map);

  // add compass
  createCompass();

  // load data
  getData();
}

//Load GeoJSON 
function getData() {
  fetch('data/NACities.geojson')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      geojsonData = data;
      attributes = processData(data);
      calcStats(data);

      createPropSymbols(data);
      createSequenceControls();
      createLegend();
      createSearchControl();
    })
    .catch(function (err) {
      console.error('GeoJSON load error:', err);
    });
}

// Build attributes array from data 
function processData(data) {
  var attList = [];
  var props = data.features[0].properties;

  for (var att in props) {
    // grab only the sequenced Pop_ fields, skip Pop_2025
    if (att.indexOf('Pop_') === 0 && att !== 'Pop_2025') {
      attList.push(att);
    }
  }
  attList.sort();
  return attList;
}

// Calc min, max, mean for legend
function calcStats(data) {
  var allValues = [];

  data.features.forEach(function (f) {
    attributes.forEach(function (att) {
      var v = Number(f.properties[att]);
      if (!isNaN(v)) allValues.push(v);
    });
  });

  dataStats.min = Math.min.apply(null, allValues);
  dataStats.max = Math.max.apply(null, allValues);

  var sum = allValues.reduce(function (a, b) { return a + b; });
  dataStats.mean = sum / allValues.length;
}

// Flannery scaling
function calcPropRadius(attValue) {
  var minRadius = 5;
  return 1.0083 * Math.pow(attValue / dataStats.min, 0.5715) * minRadius;
}

// Create proportional symbols 
function createPropSymbols(data) {
  var attribute = attributes[0];

  L.geoJSON(data, {
    pointToLayer: function (feature, latlng) {
      return pointToLayer(feature, latlng, attribute);
    }
  }).addTo(map);

  // Fit map to data bounds
  var bounds = [];
  data.features.forEach(function (f) {
    var c = f.geometry.coordinates;
    bounds.push([c[1], c[0]]);
  });
  if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
}

// Build each circle marker 
function pointToLayer(feature, latlng, attribute) {
  var attValue = Number(feature.properties[attribute]);

  var options = {
    fillColor: '#6dd5d0',
    color: '#2a8a8a',
    weight: 1,
    opacity: 1,
    fillOpacity: 0.7,
    radius: calcPropRadius(attValue)
  };

  var layer = L.circleMarker(latlng, options);

  // bind popup
  layer.bindPopup(createPopupContent(feature.properties, attribute), {
    offset: new L.Point(0, -options.radius),
    maxWidth: 260
  });

  // Highlight on hover
  layer.on('mouseover', function () { this.setStyle({ fillOpacity: 0.9, weight: 2 }); });
  layer.on('mouseout',  function () { this.setStyle({ fillOpacity: 0.7, weight: 1 }); });

  return layer;
}

// Popup content with bar chart 
function createPopupContent(props, attribute) {
  var cityName = props.City || 'City';
  var year = attribute.split('_')[1];
  var val  = props[attribute];

  // Bar chart SVG for all 9 years
  var barW = 18, barGap = 3, chartH = 60;
  var maxVal = 0;
  attributes.forEach(function (a) {
    var v = Number(props[a]);
    if (v > maxVal) maxVal = v;
  });

  var svgW = attributes.length * (barW + barGap);
  var svg = '<svg class="bar-chart" width="' + svgW + '" height="' + (chartH + 18) + '">';

  attributes.forEach(function (a, i) {
    var v = Number(props[a]);
    var h = (v / maxVal) * chartH;
    var x = i * (barW + barGap);
    var y = chartH - h;
    var cls = (a === attribute) ? 'active' : '';

    svg += '<rect class="' + cls + '" x="' + x + '" y="' + y +
           '" width="' + barW + '" height="' + h + '" rx="2"/>';
    // year label
    var shortYear = a.split('_')[1].slice(-2);
    svg += '<text x="' + (x + barW / 2) + '" y="' + (chartH + 12) +
           '" text-anchor="middle">\'' + shortYear + '</text>';
  });
  svg += '</svg>';

  // 2025 estimate
  var est2025 = props.Pop_2025 ? props.Pop_2025 : '—';

  var html =
    '<p class="popup-title">' + cityName + ', ' + (props.Country || '') + '</p>' +
    '<p class="popup-stat">Population in ' + year + ': <strong>' + val + 'K</strong></p>' +
    svg +
    '<p class="popup-stat" style="margin-top:4px;">2025 Est.: <strong>' + est2025 + 'K</strong></p>';

  return html;
}

// Sequence controls  
function createSequenceControls() {
  var SequenceControl = L.Control.extend({
    options: { position: 'bottomleft' },

    onAdd: function () {
      var container = L.DomUtil.create('div', 'sequence-control-container');

      // year display
      container.innerHTML = '<div class="year-display" id="year-display">' +
        attributes[0].split('_')[1] + '</div>';

      // Step buttons
      container.innerHTML +=
        '<button class="step" id="reverse" title="Previous year">&#9664;</button>' +
        '<button class="step" id="forward" title="Next year">&#9654;</button>';

      // hidden range to track index
      container.innerHTML +=
        "<input class='range-slider' type='range' min='0' max='" +
        (attributes.length - 1) + "' value='0' step='1' style='display:none'>";

      L.DomEvent.disableClickPropagation(container);
      return container;
    }
  });

  map.addControl(new SequenceControl());

  // button listeners
  document.querySelectorAll('.step').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var slider = document.querySelector('.range-slider');
      var index = Number(slider.value);

      if (btn.id === 'forward') {
        index++;
        index = index > attributes.length - 1 ? 0 : index;
      } else {
        index--;
        index = index < 0 ? attributes.length - 1 : index;
      }

      slider.value = index;
      updatePropSymbols(attributes[index]);
    });
  });
}

// Update symbols on sequence change 
function updatePropSymbols(attribute) {
  var year = attribute.split('_')[1];

  // Update year display
  var disp = document.getElementById('year-display');
  if (disp) disp.innerHTML = year;

  // Update temporal legend
  var span = document.querySelector('span.year');
  if (span) span.innerHTML = year;

  // Resize each marker and refresh popup
  map.eachLayer(function (layer) {
    if (layer.feature && layer.feature.properties[attribute]) {
      var props = layer.feature.properties;
      var attValue = Number(props[attribute]);

      layer.setRadius(calcPropRadius(attValue));

      // refresh popup content
      layer.getPopup().setContent(
        createPopupContent(props, attribute)
      ).update();
    }
  });
}

// Legend 
function createLegend() {
  var LegendControl = L.Control.extend({
    options: { position: 'bottomright' },

    onAdd: function () {
      var container = L.DomUtil.create('div', 'legend-control-container');

      // temporal legend
      container.innerHTML =
        '<p class="temporalLegend">Population in <span class="year">' +
        attributes[0].split('_')[1] + '</span></p>';

      // attribute legend SVG
      var svg = '<svg id="attribute-legend" width="160" height="80">';
      var circles = ['max', 'mean', 'min'];

      for (var i = 0; i < circles.length; i++) {
        var radius = calcPropRadius(dataStats[circles[i]]);
        var cy = 78 - radius;

        svg += '<circle class="legend-circle" id="' + circles[i] +
               '" r="' + radius + '" cy="' + cy + '" cx="40"/>';

        // label
        var textY = i * 18 + 16;
        svg += '<text id="' + circles[i] + '-text" x="90" y="' + textY + '">' +
               Math.round(dataStats[circles[i]]) + 'K</text>';
      }
      svg += '</svg>';

      container.innerHTML += svg;
      return container;
    }
  });

  map.addControl(new LegendControl());
}

// Search control 
function createSearchControl() {
  var SearchControl = L.Control.extend({
    options: { position: 'topleft' },

    onAdd: function () {
      var container = L.DomUtil.create('div', 'search-control-container');

      container.innerHTML =
        '<input type="text" id="search-input" placeholder="Search city..." />' +
        '<ul class="search-results" id="search-results"></ul>';

      L.DomEvent.disableClickPropagation(container);
      return container;
    }
  });

  map.addControl(new SearchControl());

  // search logic
  var input = document.getElementById('search-input');
  var resultList = document.getElementById('search-results');

  input.addEventListener('input', function () {
    var query = this.value.toLowerCase().trim();
    resultList.innerHTML = '';

    if (!query) return;

    geojsonData.features.forEach(function (f) {
      var name = f.properties.City.toLowerCase();
      if (name.indexOf(query) > -1) {
        var li = document.createElement('li');
        li.textContent = f.properties.City + ', ' + f.properties.Country;
        li.addEventListener('click', function () {
          var coords = f.geometry.coordinates;
          map.setView([coords[1], coords[0]], 8);
          resultList.innerHTML = '';
          input.value = '';

          // open popup for matching layer
          map.eachLayer(function (layer) {
            if (layer.feature && layer.feature.properties.City === f.properties.City) {
              layer.openPopup();
            }
          });
        });
        resultList.appendChild(li);
      }
    });
  });
}

// Compass indicator 
function createCompass() {
  var CompassControl = L.Control.extend({
    options: { position: 'topright' },

    onAdd: function () {
      var container = L.DomUtil.create('div', 'compass-container');

      // Simple north arrow SVG
      container.innerHTML =
        '<svg width="30" height="30" viewBox="0 0 30 30">' +
        '<polygon points="15,2 19,14 15,11 11,14" fill="#d44" stroke="#a22" stroke-width="0.5"/>' +
        '<polygon points="15,28 11,16 15,19 19,16" fill="#aaa" stroke="#888" stroke-width="0.5"/>' +
        '<text x="15" y="9" text-anchor="middle" font-size="7" font-weight="bold" fill="#fff">N</text>' +
        '</svg>';

      return container;
    }
  });

  map.addControl(new CompassControl());
}

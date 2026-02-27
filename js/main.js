/* script by Linzheng Yu */

var map;
var minValue;     // global min
var attributes;   // time fields

document.addEventListener('DOMContentLoaded', function () {
  createMap();
});

function createMap() {
  // make map
  map = L.map('map', {
    center: [20, 0],
    zoom: 2
  });

  // add basemap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  getData();
}

function getData() {
  // load GeoJSON
  fetch('data/MyData.geojson')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      attributes = processData(data);
      minValue = calcMinValue(data);

      createPropSymbols(data);
      createSequenceControls();
    })
    .catch(function (err) {
      console.error('GeoJSON load error:', err);
    });
}

function processData(data) {
  // pick time fields
  var attList = [];
  var props = data.features[0].properties;

  for (var att in props) {
    if (att.indexOf('t') === 0) attList.push(att);
  }

  attList.sort();
  return attList;
}

function calcMinValue(data) {
  // find global min
  var allValues = [];

  data.features.forEach(function (feature) {
    attributes.forEach(function (att) {
      var v = Number(feature.properties[att]);
      if (!isNaN(v)) allValues.push(v);
    });
  });

  return Math.min.apply(null, allValues);
}

function calcPropRadius(attValue) {
  // Flannery scaling
  var minRadius = 5;
  return 1.0083 * Math.pow(attValue / minValue, 0.5715) * minRadius;
}

function createPropSymbols(data) {
  // first attribute
  var attribute = attributes[0];

  // draw layer
  var layer = L.geoJSON(data, {
    pointToLayer: function (feature, latlng) {
      return pointToLayer(feature, latlng, attribute);
    }
  }).addTo(map);

  // zoom to data
  if (layer.getBounds && layer.getBounds().isValid()) {
    map.fitBounds(layer.getBounds(), { padding: [20, 20] });
  }
}

function pointToLayer(feature, latlng, attribute) {
  // make circle marker
  var attValue = Number(feature.properties[attribute]);

  var options = {
    fillColor: '#ff7800',
    color: '#000',
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8,
    radius: calcPropRadius(attValue)
  };

  var circle = L.circleMarker(latlng, options);

  // popup
  circle.bindPopup(createPopup(feature.properties, attribute));

  return circle;
}

function createPopup(props, attribute) {
  // popup text
  var name = props.city || props.City || props.name || 'Site';
  var year = attribute.replace('t', '');
  var val = props[attribute];

  var html = '<b>' + name + '</b><br>' + year + ': ' + val;
  return html;
}

function createSequenceControls() {
  // add control box
  var SequenceControl = L.Control.extend({
    options: { position: 'topright' },

    onAdd: function () {
      var container = L.DomUtil.create('div', 'sequence-control-container');

      container.innerHTML =
        "<input class='range-slider' type='range' min='0' max='" +
        (attributes.length - 1) +
        "' value='0' step='1'>" +
        "<button class='step' id='reverse'>Reverse</button>" +
        "<button class='step' id='forward'>Forward</button>";

      // stop map drag when using controls
      L.DomEvent.disableClickPropagation(container);

      return container;
    }
  });

  map.addControl(new SequenceControl());

  // button events
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

  // slider event
  document.querySelector('.range-slider').addEventListener('input', function () {
    var index = Number(this.value);
    updatePropSymbols(attributes[index]);
  });
}

function updatePropSymbols(attribute) {
  // resize and update popup
  map.eachLayer(function (layer) {
    if (layer.feature && layer.feature.properties[attribute]) {
      var props = layer.feature.properties;
      var attValue = Number(props[attribute]);

      layer.setRadius(calcPropRadius(attValue));
      layer.getPopup().setContent(createPopup(props, attribute)).update();
    }
  });
}
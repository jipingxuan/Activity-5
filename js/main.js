/* script by Linzheng Yu */

document.addEventListener('DOMContentLoaded', function () {
  createMap();
});

var map;

function createMap() {
  map = L.map('map', {
    center: [20, 0],
    zoom: 2
  });

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
    .then(function (data) { addData(data); })
    .catch(function (err) {
      console.error('GeoJSON load error:', err);
    });
}

function addData(data) {
  // draw points
  var layer = L.geoJSON(data, {
    pointToLayer: function (feature, latlng) {
      return L.circleMarker(latlng, {
        radius: 6,
        weight: 1,
        fillOpacity: 0.8
      });
    },
    onEachFeature: function (feature, lyr) {
      lyr.bindPopup(makePopup(feature.properties));
    }
  }).addTo(map);

  // zoom to data
  if (layer.getBounds && layer.getBounds().isValid()) {
    map.fitBounds(layer.getBounds(), { padding: [20, 20] });
  }
}

function makePopup(p) {
  var name = p.city || p.City || p.name || 'Site';
  var html = '<b>' + name + '</b><br>';

  // 7 continuous fields
  var fields = ['t2010','t2011','t2012','t2013','t2014','t2015','t2016'];

  fields.forEach(function (f) {
    if (p[f] !== undefined && p[f] !== null) {
      html += f.replace('t', '') + ': ' + p[f] + '<br>';
    }
  });

  return html;
}
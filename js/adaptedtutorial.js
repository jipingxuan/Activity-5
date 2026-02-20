document.addEventListener('DOMContentLoaded', function () {
  createMap();
});

var map;

function createMap() {
  map = L.map('map', {
    center: [20, 0],
    zoom: 2
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  getData();
}

function getData() {
  fetch('data/MyData.geojson')
    .then(function (r) { return r.json(); })
    .then(function (data) { addData(data); })
    .catch(function (err) { console.error('GeoJSON load error:', err); });
}

function addData(data) {
  L.geoJSON(data, {
    pointToLayer: function (feature, latlng) {
      return L.circleMarker(latlng, {
        radius: 6,
        weight: 1,
        fillOpacity: 0.8
      });
    },
    onEachFeature: function (feature, layer) {
      layer.bindPopup(makePopup(feature.properties));
    }
  }).addTo(map);
}

function makePopup(p) {
  var html = '<b>' + (p.city || p.City || p.name || 'Site') + '</b><br>';

  var years = [2010, 2011, 2012, 2013, 2014, 2015, 2016];
  years.forEach(function (y) {
    var k = 't' + y;
    if (p[k] !== undefined) html += y + ': ' + p[k] + '<br>';
  });

  return html;
}
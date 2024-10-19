!(function() {
    'use strict';

    L.Marker.Measurement = L[L.Layer ? 'Layer' : 'Class'].extend({
        options: {
            pane: 'markerPane'
        },

        initialize: function(latlng, measurement, title, rotation, options) {
            L.setOptions(this, options);

            this._latlng = latlng;
            this._measurement = measurement;
            this._title = title;
            this._rotation = rotation;
        },

        addTo: function(map) {
            map.addLayer(this);
            return this;
        },

        onAdd: function(map) {
            this._map = map;
            var pane = this.getPane ? this.getPane() : map.getPanes().markerPane;
            var el = this._element = L.DomUtil.create('div', 'leaflet-zoom-animated leaflet-measure-path-measurement gis-themeaware ' + (map.baseLayerTheme === 'dark' ? 'gis-theme-dark' : 'gis-theme-light'), pane);
            var inner = L.DomUtil.create('div', '', el);
            inner.title = this._title;
            inner.innerHTML = this._measurement;

            map.on('zoomanim', this._animateZoom, this);
            map.on('viewreset', this._setPosition, this);
            this._setPosition();
        },

        onRemove: function(map) {
            map.off('zoomanim', this._animateZoom, this);
            map.off('viewreset', this._setPosition, this);
            var pane = this.getPane ? this.getPane() : map.getPanes().markerPane;
            pane.removeChild(this._element);
            this._map = null;
        },

        _setPosition: function() {
            L.DomUtil.setPosition(this._element, this._map.latLngToLayerPoint(this._latlng));
            this._element.style.transform += ' rotate(' + this._rotation + 'rad)';
        },

        _animateZoom: function(opt) {
            var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).round();
            L.DomUtil.setPosition(this._element, pos);
            this._element.style.transform += ' rotate(' + this._rotation + 'rad)';
        }
    });

    L.marker.measurement = function(latLng, measurement, title, rotation, options) {
        return new L.Marker.Measurement(latLng, measurement, title, rotation, options);
    };

    var formatDistance = function(d) {
        var unit,
            feet;

        if (this._measurementOptions.imperial) {
            feet = d / 0.3048;
            if (feet > 3000) {
                d = d / 1609.344;
                unit = 'mi';
            } else {
                d = feet;
                unit = 'ft';
            }
        } else {
            if (d > 1000) {
                d = d / 1000;
                unit = 'км';
            } else {
                unit = 'м';
            }
        }

        if (d < 100) {
            return d.toFixed(1) + ' ' + unit;
        } else {
            return Math.round(d) + ' ' + unit;
        }
    }

    var formatArea = function(a) {
        var unit,
            sqfeet;

        if (this._measurementOptions.imperial) {
            if (a > 404.685642) {
                a = a / 4046.85642;
                unit = 'ac';
            } else {
                a = a / 0.09290304;
                unit = 'ft²';
            }
        } else if (this._measurementOptions.ha) {
            if (a > 1000000000) {
                a = a / 1000000000;
                unit = 'km²';
            } else if (a > 10000) {
                a = a / 10000;
                unit = 'ha';
            } else {
                unit = 'm²';
            }
        } else {
            // Added by Andrey (Previous value: 1000000)
            if (a > 100000) {
                a = a / 1000000;
                unit = 'км²';
            } else {
                unit = 'м²';
            }
        }

        if (a < 1) {
            return a.toFixed(2) + ' ' + unit;
        } else if(a < 100) {
            return a.toFixed(1) + ' ' + unit;
        } else {
            return Math.round(a) + ' ' + unit;
        }
    }

    var RADIUS = 6378137;
    // ringArea function copied from geojson-area
    // (https://github.com/mapbox/geojson-area)
    // This function is distributed under a separate license,
    // see LICENSE.md.
    var ringArea = function ringArea(coords) {
        var rad = function rad(_) {
            return _ * Math.PI / 180;
        };
        var p1, p2, p3, lowerIndex, middleIndex, upperIndex,
        area = 0,
        coordsLength = coords.length;

        if (coordsLength > 2) {
            for (var i = 0; i < coordsLength; i++) {
                if (i === coordsLength - 2) {// i = N-2
                    lowerIndex = coordsLength - 2;
                    middleIndex = coordsLength -1;
                    upperIndex = 0;
                } else if (i === coordsLength - 1) {// i = N-1
                    lowerIndex = coordsLength - 1;
                    middleIndex = 0;
                    upperIndex = 1;
                } else { // i = 0 to N-3
                    lowerIndex = i;
                    middleIndex = i+1;
                    upperIndex = i+2;
                }
                p1 = coords[lowerIndex];
                p2 = coords[middleIndex];
                p3 = coords[upperIndex];
                area += ( rad(p3.lng) - rad(p1.lng) ) * Math.sin( rad(p2.lat));
            }

            area = area * RADIUS * RADIUS / 2;
        }

        return Math.abs(area);
    };
    /**
     * Handles the init hook for polylines and circles.
     * Implements the showOnHover functionality if called for.
     */
    var addInitHook = function() {
        var showOnHover = this.options.measurementOptions && this.options.measurementOptions.showOnHover;
        if (this.options.showMeasurements && !showOnHover) {
            this.showMeasurements();
        }
        if (this.options.showMeasurements && showOnHover) {
            this.on('mouseover', function() {
                this.showMeasurements();
            });
            this.on('mouseout', function() {
                this.hideMeasurements();
            });
        }
    };


    var override = function(method, fn, hookAfter) {
        if (!hookAfter) {
            return function() {
                var originalReturnValue = method.apply(this, arguments);
                var args = Array.prototype.slice.call(arguments)
                args.push(originalReturnValue);
                return fn.apply(this, arguments);
            }
        } else {
            return function() {
                fn.apply(this, arguments);
                return method.apply(this, arguments);
            }
        }
    };
    var PathMeasurementsMixin = {
        showMeasurements: function (options) {
            if (!this._map || this._measurementLayer) return this;

            this._measurementOptions = L.extend({
                showOnHover: (options && options.showOnHover) || false,
                minPixelDistance: 30,
                showDistances: true,
                showArea: true,
                lang: {
                    totalLength: 'Total length',
                    totalArea: 'Total area',
                    segmentLength: 'Segment length'
                }
            }, options || {});

            this._measurementLayer = L.layerGroup().addTo(this._map);
            this.updateMeasurements();

            this._map.on('zoomend', this.updateMeasurements, this);

            return this;
        },

        hideMeasurements: function () {
            if (!this._map) return this;

            this._map.off('zoomend', this.updateMeasurements, this);

            if (!this._measurementLayer) return this;
            this._map.removeLayer(this._measurementLayer);
            this._measurementLayer = null;

            return this;
        },

        onAdd: override(L.EditableGisPolyline.prototype.onAdd, function (originalReturnValue) {
            if (this.options && !this.options.noMeasurements) { 
                var showOnHover = this.options.measurementOptions && this.options.measurementOptions.showOnHover;
                if (this.options.showMeasurements && !showOnHover) {
                    this.showMeasurements(this.options.measurementOptions);
                    }
            }

            return originalReturnValue;
        }),

        onRemove: override(L.Polyline.prototype.onRemove, function (originalReturnValue) {
            this.hideMeasurements();

            return originalReturnValue;
        }, true),

        setLatLngs: override(L.Polyline.prototype.setLatLngs, function (originalReturnValue) {
            this.updateMeasurements();

            return originalReturnValue;
        }, true),

        spliceLatLngs: override(L.Polyline.prototype.spliceLatLngs, function (originalReturnValue) {
            this.updateMeasurements();

            return originalReturnValue;
        }),

        formatDistance: formatDistance,
        formatArea: formatArea,
        declination: [],
        requestInProgress: false,

        updateMeasurements: function() {
            if (!this._measurementLayer) return this;

            var latLngs = this.getLatLngs(),
                isPolygon = this instanceof L.Polygon,
                options = this._measurementOptions,
                totalDist = 0,
                formatter,
                ll1,
                ll2,
                p1,
                p2,
                pixelDist,
                dist;

            if (latLngs && latLngs.length && L.Util.isArray(latLngs[0])) {
                // Outer ring is stored as an array in the first element,
                // use that instead.
                latLngs = latLngs[0];
            }

            if (latLngs && L.Util.isArray(latLngs) && latLngs.length >= 2) {
                const mapBounds = this._map.getBounds();
                const layerBounds = L.latLngBounds(latLngs);
                const invisible = !mapBounds.intersects(layerBounds);
                if (invisible) return this;
            }
            this._measurementLayer.clearLayers();

            if (this._measurementOptions.showDistances && latLngs.length > 1) {
                formatter = this._measurementOptions.formatDistance || L.bind(this.formatDistance, this);

                for (var i = 1, len = latLngs.length; (isPolygon && i <= len) || i < len; i++) {
                    ll1 = latLngs[i - 1];
                    ll2 = latLngs[i % len];
                    dist = ll1.distanceTo(ll2);
                    totalDist += dist;

                    p1 = this._map.latLngToLayerPoint(ll1);
                    p2 = this._map.latLngToLayerPoint(ll2);

                    pixelDist = p1.distanceTo(p2);

                    if (pixelDist >= options.minPixelDistance) {
                        L.marker.measurement(
                            this._map.layerPointToLatLng([(p1.x + p2.x) / 2, (p1.y + p2.y) / 2]),
                            formatter(dist), options.lang.segmentLength, this._getRotation(ll1, ll2), options)
                            .addTo(this._measurementLayer);
                    }
                }

                // Show total length for polylines
                if (!isPolygon) {
                    if (latLngs.length > 2) {
                        L.marker.measurement(ll2, formatter(totalDist), options.lang.totalLength, 0, options)
                            .addTo(this._measurementLayer);
                    }
                    else {
                        // Andrey: if points == 2 - show degrees instead of distance
                        let tmpAngle = this._getLineAngle(latLngs[0], latLngs[1]);
                        let declination = this._getDeclination(latLngs[0]);
                        if (!declination) {
                            L.marker.measurement(ll2, formatter(totalDist) + ', ' + Math.round(tmpAngle) + '°', options.lang.totalLength, 0, options)
                                .addTo(this._measurementLayer);
                        }
                        else {
                            let correctedAngle = tmpAngle - declination;
                            if (Math.round(correctedAngle) < 0) correctedAngle += 360;
                            if (Math.round(correctedAngle) > 360) correctedAngle -= 360;

                            L.marker.measurement(ll2, formatter(totalDist) + ', ' + Math.round(tmpAngle) + `° (магн. ${Math.round(correctedAngle)}°)`, options.lang.totalLength, 0, options)
                                .addTo(this._measurementLayer);
                        }
                    }
                }
            }

            if (isPolygon && options.showArea && latLngs.length > 2) {
                formatter = options.formatArea || L.bind(this.formatArea, this);
                var area = ringArea(latLngs);
                //getBounds() updated only after setBounds(). We either will have stuck area or will get stack overflow exception. Bug #472
                L.marker.measurement(this.getBounds().getCenter(),
                    formatter(area), options.lang.totalArea, 0, options)
                    .addTo(this._measurementLayer);
            }

            return this;
        },

        _getRotation: function(ll1, ll2) {
            var p1 = this._map.project(ll1),
                p2 = this._map.project(ll2);

            return Math.atan((p2.y - p1.y) / (p2.x - p1.x));
        },

        // Added by Andrey - get Angle for line
        _getLineAngle: function (start, end) {
            let p1 = this._map.project(start);
            let p2 = this._map.project(end);
            let tmpAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI + 180;
            if (Math.round(tmpAngle) >= 90) {
                return (tmpAngle - 90);
            }
            else {
                return (270 + tmpAngle);
            }
        },

        _getDeclination: function (start) {
            if (!(window && window.PageModel && window.PageModel.backendAddress)) return;
            if (!navigator.onLine) return;

            const lat = Math.round(start.lat);
            const lng = Math.round(start.lng);
            let cache = this.declination;
            var cacheMatch = cache.filter(d => d.lat === lat && d.lng === lng);
            let layer = this;
            if (cacheMatch.length > 0) return cacheMatch[0].declination;

            try {
                if (this.requestInProgress) return;
                this.requestInProgress = true;
                const xmlhttp = new XMLHttpRequest();
                xmlhttp.open("GET", `${window.PageModel.backendAddress}/magneticdeclination/noaa/${lat}/${lng}`, true);
                xmlhttp.setRequestHeader("Content-type", "application/json");
                xmlhttp.withCredentials = true;
                xmlhttp.timeout = 5000;
                xmlhttp.send();
                xmlhttp.onreadystatechange = function () {
                    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                        try {
                            const cacheValue = new L.latLng(lat, lng);
                            cacheValue.declination = Number.parseFloat(xmlhttp.response);
                            cache.push(cacheValue);
                            this.requestInProgress = false;
                            layer.updateMeasurements();
                        } catch (err) {
                            console.warn(err);
                            this.requestInProgress = false;
                        }
                    }
                }
            } catch (err) {
                this.requestInProgress = false;
            }
        }
    };
    L.EditableGisPolyline.include(PathMeasurementsMixin);
    L.EditableGisPolyline.addInitHook(function() {
        addInitHook.call(this);
    });

    L.EditableGisPolygon.include(PathMeasurementsMixin);
    L.EditableGisPolygon.addInitHook(function() {
        addInitHook.call(this);
    });
})();

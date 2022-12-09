declare namespace L {
    declare namespace Marker {
        declare interface Measurement extends L.Layer {

        }
    }
    declare namespace marker {
        declare function measurement(latLng, measurement, title, rotation, options): L.Marker.Measurement;
    }
    declare interface PathMeasurementsMixin {
        _measurementOptions: IMeasurementOptions;
        _measurementLayer: L.LayerGroup
        showMeasurements: (options?: IMeasurementOptions) => this;
        hideMeasurements: () => this;
        updateMeasurements: () => this;
    }
    declare interface IMeasurementOptions {
        ha?: boolean;
        imperial?: boolean;
        formatArea?: (area: number) => string;
        showMeasurements?: boolean;
        showOnHover?: boolean;
        minPixelDistance?: number;
        showDistances?: boolean;
        showArea?: boolean;
        lang?: {
            totalLength: string;
            totalArea: string;
            segmentLength: string;
        }
    }
}
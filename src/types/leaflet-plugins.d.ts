import 'leaflet'

declare module 'leaflet' {
  interface MapOptions {
    fullscreenControl?: boolean
    fullscreenControlOptions?: { position?: ControlPosition }
  }

  namespace control {
    function locate(options?: Record<string, unknown>): Control
    function minimap(layer: TileLayer, options?: Record<string, unknown>): Control
  }
}

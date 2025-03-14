/**
 * MapboxService
 */
import type { IMercator } from '@antv/l7-core';
import { mat4, vec3 } from 'gl-matrix';
import type { Map } from 'maplibre-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import Viewport from '../lib/web-mercator-viewport';
import { MapType, type IMapboxInstance } from '../types';
import BaseMapService from '../utils/BaseMapService';

// @ts-ignore
window.maplibregl = maplibregl;

let mapdivCount = 0;

// TODO: 基于抽象类 BaseMap 实现
export default class Service extends BaseMapService<Map & IMapboxInstance> {
  public version: string = MapType.MAPBOX;
  // get mapStatus method

  public viewport: Viewport;

  public getType() {
    return 'mapbox';
  }

  /**
   * 将经纬度转成墨卡托坐标
   * @param lnglat
   * @returns
   */
  public lngLatToCoord(lnglat: [number, number], origin: IMercator = { x: 0, y: 0, z: 0 }) {
    // @ts-ignore
    const { x, y } = this.lngLatToMercator(lnglat, 0);
    return [x - origin.x, y - origin.y] as [number, number];
  }

  public lngLatToMercator(lnglat: [number, number], altitude: number): IMercator {
    const {
      x = 0,
      y = 0,
      z = 0,
    } = window.maplibregl.MercatorCoordinate.fromLngLat(lnglat, altitude);
    return { x, y, z };
  }
  public getModelMatrix(
    lnglat: [number, number],
    altitude: number,
    rotate: [number, number, number],
    scale: [number, number, number] = [1, 1, 1],
    origin: IMercator = { x: 0, y: 0, z: 0 },
  ): number[] {
    const modelAsMercatorCoordinate = window.maplibregl.MercatorCoordinate.fromLngLat(
      lnglat,
      altitude,
    );
    // @ts-ignore
    const meters = modelAsMercatorCoordinate.meterInMercatorCoordinateUnits();
    const modelMatrix = mat4.create();

    mat4.translate(
      modelMatrix,
      modelMatrix,
      vec3.fromValues(
        modelAsMercatorCoordinate.x - origin.x,
        modelAsMercatorCoordinate.y - origin.y,
        modelAsMercatorCoordinate.z || 0 - origin.z,
      ),
    );

    mat4.scale(
      modelMatrix,
      modelMatrix,
      vec3.fromValues(meters * scale[0], -meters * scale[1], meters * scale[2]),
    );

    mat4.rotateX(modelMatrix, modelMatrix, rotate[0]);
    mat4.rotateY(modelMatrix, modelMatrix, rotate[1]);
    mat4.rotateZ(modelMatrix, modelMatrix, rotate[2]);

    return modelMatrix as unknown as number[];
  }

  public async init(): Promise<void> {
    const {
      id = 'map',
      attributionControl = false,
      style = 'light',
      rotation = 0,
      mapInstance,
      ...rest
    } = this.config;

    this.viewport = new Viewport();

    /**
     * TODO: 使用 mapbox v0.53.x 版本 custom layer，需要共享 gl context
     * @see https://github.com/mapbox/mapbox-gl-js/blob/master/debug/threejs.html#L61-L64
     */

    // 判断全局 maplibregl 对象的加载
    if (!mapInstance && !window.maplibregl) {
      // 用户有时传递进来的实例是继承于 mapbox 实例化的，不一定是 maplibregl 对象。
      console.error(this.configService.getSceneWarninfo('SDK'));
    }

    if (mapInstance) {
      // @ts-ignore
      this.map = mapInstance;
      this.$mapContainer = this.map.getContainer();
    } else {
      this.$mapContainer = this.creatMapContainer(id);

      if (typeof style !== 'string') {
        this.addProtocol();
      }
      // @ts-ignore
      this.map = new window.maplibregl.Map({
        container: this.$mapContainer,
        style: this.getMapStyleValue(style),
        attributionControl,
        bearing: rotation,
        ...rest,
      });
    }
    this.map.on('load', () => {
      this.handleCameraChanged();
    });
    this.map.on('move', this.handleCameraChanged);

    // 不同于高德地图，需要手动触发首次渲染
    this.handleCameraChanged();
  }
  public addProtocol() {
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
  }
  public destroy() {
    // 销毁地图可视化层的容器
    this.$mapContainer?.parentNode?.removeChild(this.$mapContainer);

    this.eventEmitter.removeAllListeners();
    if (this.map) {
      this.map.remove();
      this.$mapContainer = null;
    }
  }
  public emit(name: string, ...args: any[]) {
    this.eventEmitter.emit(name, ...args);
  }
  public once(name: string, ...args: any[]) {
    this.eventEmitter.once(name, ...args);
  }

  public getMapContainer() {
    return this.$mapContainer;
  }

  public getCanvasOverlays() {
    return this.getMapContainer()?.querySelector('.maplibregl-canvas-container') as HTMLElement;
  }

  public meterToCoord(center: [number, number], outer: [number, number]) {
    // 统一根据经纬度来转化
    // Tip: 实际米距离 unit meter
    const centerLnglat = new maplibregl.LngLat(center[0], center[1]);

    const outerLnglat = new maplibregl.LngLat(outer[0], outer[1]);
    const meterDis = centerLnglat.distanceTo(outerLnglat);

    // Tip: 三维世界坐标距离

    const centerMercator = maplibregl.MercatorCoordinate.fromLngLat({
      lng: center[0],
      lat: center[1],
    });
    const outerMercator = maplibregl.MercatorCoordinate.fromLngLat({
      lng: outer[0],
      lat: outer[1],
    });
    const { x: x1, y: y1 } = centerMercator;
    const { x: x2, y: y2 } = outerMercator;
    // Math.pow(2, 22) 4194304
    const coordDis = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) * 4194304 * 2;

    return coordDis / meterDis;
  }

  public exportMap(type: 'jpg' | 'png'): string {
    const renderCanvas = this.map.getCanvas();
    const layersPng =
      type === 'jpg'
        ? (renderCanvas?.toDataURL('image/jpeg') as string)
        : (renderCanvas?.toDataURL('image/png') as string);
    return layersPng;
  }

  protected creatMapContainer(id: string | HTMLDivElement) {
    let $wrapper = id as HTMLDivElement;
    if (typeof id === 'string') {
      $wrapper = document.getElementById(id) as HTMLDivElement;
    }
    const $amapdiv = document.createElement('div');
    $amapdiv.style.cssText += `
      position: absolute;
      top: 0;
      height: 100%;
      width: 100%;
    `;
    $amapdiv.id = 'l7_mapbox_div' + mapdivCount++;
    $wrapper.appendChild($amapdiv);
    return $amapdiv;
  }
}

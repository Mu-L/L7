import type { MapOptions } from '../../src/map/map';
import { Map } from '../../src/map/map';
import { DOM } from '../../src/map/util/dom';
import simulate from '../libs/simulate_interaction';
import { beforeMapTest } from '../libs/util';

function createMap() {
  return new Map({
    interactive: true,
    container: DOM.create('div', '', window.document.body),
  } as any as MapOptions);
}

beforeEach(() => {
  beforeMapTest();
});

describe('map events', () => {
  test('MapEvent handler fires touch events with correct values', () => {
    const map = createMap();
    const target = map.getCanvasContainer();

    const touchstart = jest.fn();
    const touchmove = jest.fn();
    const touchend = jest.fn();

    map.on('touchstart', touchstart);
    map.on('touchmove', touchmove);
    map.on('touchend', touchend);

    const touchesStart = [{ target, identifier: 1, clientX: 0, clientY: 50 }];
    const touchesMove = [{ target, identifier: 1, clientX: 0, clientY: 60 }];
    const touchesEnd = [{ target, identifier: 1, clientX: 0, clientY: 60 }];

    simulate.touchstart(map.getCanvasContainer(), {
      touches: touchesStart,
      targetTouches: touchesStart,
    });
    expect(touchstart).toHaveBeenCalledTimes(1);
    expect(touchstart.mock.calls[0][0].point).toEqual({ x: 0, y: 50 });
    expect(touchmove).toHaveBeenCalledTimes(0);
    expect(touchend).toHaveBeenCalledTimes(0);

    simulate.touchmove(map.getCanvasContainer(), {
      touches: touchesMove,
      targetTouches: touchesMove,
    });
    expect(touchstart).toHaveBeenCalledTimes(1);
    expect(touchmove).toHaveBeenCalledTimes(1);
    expect(touchmove.mock.calls[0][0].point).toEqual({ x: 0, y: 60 });
    expect(touchend).toHaveBeenCalledTimes(0);

    simulate.touchend(map.getCanvasContainer(), {
      touches: [],
      targetTouches: [],
      changedTouches: touchesEnd,
    });
    expect(touchstart).toHaveBeenCalledTimes(1);
    expect(touchmove).toHaveBeenCalledTimes(1);
    expect(touchend).toHaveBeenCalledTimes(1);
    expect(touchend.mock.calls[0][0].point).toEqual({ x: 0, y: 60 });

    map.remove();
  });

  test('MapEvent handler fires touchmove even while drag handler is active', () => {
    const map = createMap();
    const target = map.getCanvasContainer();
    map.dragPan.enable();

    const touchstart = jest.fn();
    const touchmove = jest.fn();
    const touchend = jest.fn();
    const drag = jest.fn();

    map.on('touchstart', touchstart);
    map.on('touchmove', touchmove);
    map.on('touchend', touchend);
    map.on('drag', drag);

    const touchesStart = [{ target, identifier: 1, clientX: 0, clientY: 50 }];
    const touchesMove = [{ target, identifier: 1, clientX: 0, clientY: 60 }];
    const touchesEnd = [{ target, identifier: 1, clientX: 0, clientY: 60 }];

    simulate.touchstart(map.getCanvasContainer(), {
      touches: touchesStart,
      targetTouches: touchesStart,
    });
    expect(touchstart).toHaveBeenCalledTimes(1);
    expect(touchstart.mock.calls[0][0].point).toEqual({ x: 0, y: 50 });
    expect(touchmove).toHaveBeenCalledTimes(0);
    expect(touchend).toHaveBeenCalledTimes(0);

    simulate.touchmove(map.getCanvasContainer(), {
      touches: touchesMove,
      targetTouches: touchesMove,
    });
    expect(touchstart).toHaveBeenCalledTimes(1);
    expect(touchmove).toHaveBeenCalledTimes(1);
    expect(touchmove.mock.calls[0][0].point).toEqual({ x: 0, y: 60 });
    expect(touchend).toHaveBeenCalledTimes(0);

    simulate.touchend(map.getCanvasContainer(), {
      touches: [],
      targetTouches: [],
      changedTouches: touchesEnd,
    });
    expect(touchstart).toHaveBeenCalledTimes(1);
    expect(touchmove).toHaveBeenCalledTimes(1);
    expect(touchend).toHaveBeenCalledTimes(1);
    expect(touchend.mock.calls[0][0].point).toEqual({ x: 0, y: 60 });

    map._renderTaskQueue.run();
    expect(drag).toHaveBeenCalledTimes(1);

    map.remove();
  });

  test('MapEvent handler fires contextmenu on MacOS/Linux, but only at mouseup', () => {
    const map = createMap();
    const target = map.getCanvasContainer();
    map.dragPan.enable();

    const contextmenu = jest.fn();

    map.on('contextmenu', contextmenu);

    simulate.mousedown(map.getCanvasContainer(), { target, button: 2, clientX: 10, clientY: 10 });
    simulate.contextmenu(map.getCanvasContainer(), { target }); // triggered immediately after mousedown
    expect(contextmenu).toHaveBeenCalledTimes(0);
    simulate.mouseup(map.getCanvasContainer(), { target, button: 2, clientX: 10, clientY: 10 });
    expect(contextmenu).toHaveBeenCalledTimes(1);
  });

  test('MapEvent handler does not fire contextmenu on MacOS/Linux, when moved', () => {
    const map = createMap();
    const target = map.getCanvasContainer();
    map.dragPan.enable();

    const contextmenu = jest.fn();

    map.on('contextmenu', contextmenu);

    simulate.mousedown(map.getCanvasContainer(), { target, button: 2, clientX: 10, clientY: 10 });
    simulate.contextmenu(map.getCanvasContainer(), { target }); // triggered immediately after mousedown
    simulate.mousemove(map.getCanvasContainer(), { target, buttons: 2, clientX: 50, clientY: 10 });
    simulate.mouseup(map.getCanvasContainer(), { target, button: 2, clientX: 70, clientY: 10 });
    expect(contextmenu).toHaveBeenCalledTimes(0);
  });

  test('MapEvent handler fires contextmenu on Windows', () => {
    const map = createMap();
    const target = map.getCanvasContainer();
    map.dragPan.enable();

    const contextmenu = jest.fn();

    map.on('contextmenu', contextmenu);

    simulate.mousedown(map.getCanvasContainer(), { target, button: 2, clientX: 10, clientY: 10 });
    simulate.mouseup(map.getCanvasContainer(), { target, button: 2, clientX: 10, clientY: 10 });
    expect(contextmenu).toHaveBeenCalledTimes(0);
    simulate.contextmenu(map.getCanvasContainer(), { target, button: 2, clientX: 10, clientY: 10 }); // triggered only after mouseup
    expect(contextmenu).toHaveBeenCalledTimes(1);
  });

  test('MapEvent handler does not fire contextmenu on Windows, when moved', () => {
    const map = createMap();
    const target = map.getCanvasContainer();
    map.dragPan.enable();

    const contextmenu = jest.fn();

    map.on('contextmenu', contextmenu);

    simulate.mousedown(map.getCanvasContainer(), { target, button: 2, clientX: 10, clientY: 10 });
    simulate.mousemove(map.getCanvasContainer(), { target, buttons: 2, clientX: 50, clientY: 10 });
    simulate.mouseup(map.getCanvasContainer(), { target, button: 2, clientX: 50, clientY: 10 });
    simulate.contextmenu(map.getCanvasContainer(), { target, button: 2, clientX: 10, clientY: 10 }); // triggered only after mouseup
    expect(contextmenu).toHaveBeenCalledTimes(0);
  });
});

export const defaultOptions = {
  xAxis: true,
  yAxis: true,
};

export default class Mirror {
  constructor(draggable) {
    this.draggable = draggable;
    this.mirrorOptions = {
      ...defaultOptions,
      ...this.draggableMirrorOptions(),
    };

    this._onMirrorCreated = this._onMirrorCreated.bind(this);
    this._onMirrorMove = this._onMirrorMove.bind(this);
  }

  attach() {
    this.draggable
      .on('mirror:created', this._onMirrorCreated)
      .on('mirror:created', onMirrorCreated)
      .on('mirror:move', this._onMirrorMove);
  }

  detach() {
    this.draggable
      .off('mirror:created', this._onMirrorCreated)
      .off('mirror:created', onMirrorCreated)
      .off('mirror:move', this._onMirrorMove);
  }

  draggableMirrorOptions() {
    return this.draggable.options.mirror;
  }

  _onMirrorCreated({mirror, source, sensorEvent}) {
    const mirrorClass = this.draggable.getClassNameFor('mirror');

    const setState = ({mirrorOffset, lastX, lastY, ...args}) => {
      this.mirrorOffset = mirrorOffset;
      this.lastX = lastX;
      this.lastY = lastY;
      return {mirrorOffset, lastX, lastY, ...args};
    };

    const initialState = {
      mirror,
      source,
      sensorEvent,
      mirrorClass,
      options: this.mirrorOptions,
    };

    Promise.resolve(initialState)
      .then(computeMirrorDimensions)
      .then(calculateMirrorOffset)
      .then(addMirrorClasses)
      .then(positionMirror({initial: true}))
      .then(removeMirrorID)
      .then(setState)
      .catch();
  }

  _onMirrorMove({mirror, sensorEvent}) {
    const initialState = {
      mirror,
      sensorEvent,
      mirrorOffset: this.mirrorOffset,
      options: this.mirrorOptions,
      lastX: this.lastX,
      lastY: this.lastY,
    };

    Promise.resolve(initialState)
      .then(positionMirror({raf: true}))
      .catch();
  }
}

function onMirrorCreated({mirror, source}) {
  Promise.resolve({mirror, source})
    .then(resetMirror)
    .catch();
}

function resetMirror({mirror, source, ...args}) {
  return withPromise((resolve) => {
    mirror.style.position = 'fixed';
    mirror.style.pointerEvents = 'none';
    mirror.style.top = 0;
    mirror.style.left = 0;
    mirror.style.width = `${source.offsetWidth}px`;
    mirror.style.height = `${source.offsetHeight}px`;

    resolve({mirror, source, ...args});
  });
}

function computeMirrorDimensions({source, ...args}) {
  return withPromise((resolve) => {
    const sourceRect = source.getBoundingClientRect();
    resolve({source, sourceRect, ...args});
  });
}

function calculateMirrorOffset({sensorEvent, sourceRect, ...args}) {
  return withPromise((resolve) => {
    const mirrorOffset = {top: sensorEvent.clientY - sourceRect.top, left: sensorEvent.clientX - sourceRect.left};
    resolve({sensorEvent, sourceRect, mirrorOffset, ...args});
  });
}

function addMirrorClasses({mirror, mirrorClass, ...args}) {
  return withPromise((resolve) => {
    mirror.classList.add(mirrorClass);
    resolve({mirror, mirrorClass, ...args});
  });
}

function removeMirrorID({mirror, ...args}) {
  return withPromise((resolve) => {
    mirror.removeAttribute('id');
    delete mirror.id;
    resolve({mirror, ...args});
  });
}

function positionMirror({withFrame = false, initial = false} = {}) {
  return ({mirror, sensorEvent, mirrorOffset, lastY, lastX, options, ...args}) => {
    return withPromise((resolve) => {
      const result = {
        mirror,
        sensorEvent,
        mirrorOffset,
        options,
        ...args,
      };

      if (mirrorOffset) {
        const x = sensorEvent.clientX - mirrorOffset.left;
        const y = sensorEvent.clientY - mirrorOffset.top;

        if ((options.xAxis && options.yAxis) || initial) {
          mirror.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        } else if (options.xAxis && !options.yAxis) {
          mirror.style.transform = `translate3d(${x}px, ${lastY}px, 0)`;
        } else if (options.yAxis && !options.xAxis) {
          mirror.style.transform = `translate3d(${lastX}px, ${y}px, 0)`;
        }

        if (initial) {
          result.lastX = x;
          result.lastY = y;
        }

        resolve(result);
      }

      resolve(result);
    }, {frame: withFrame});
  };
}

function withPromise(callback, {raf = false} = {}) {
  return new Promise((resolve, reject) => {
    if (raf) {
      requestAnimationFrame(() => {
        callback(resolve, reject);
      });
    } else {
      callback(resolve, reject);
    }
  });
}

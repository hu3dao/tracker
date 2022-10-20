import { DefaultOptions, TrackerConfig, Options } from "../types/core"
import { createHistoryEvnent } from "../utils/pv"

const MouseEventList: string[] = ['click', 'dblclick', 'contextmenu', 'mousedown', 'mouseup', 'mouseenter', 'mouseout', 'mouseover']

export default class Tracker {
  public data: Options // 参数
  constructor(options: Options) {
    // 合并参数
    this.data = Object.assign({}, this.initDefaultOptions(), options)
    this.rewriteHistoryFn()
    this.installTracker()
  }
  // 返回默认参数
  private initDefaultOptions(): DefaultOptions {
    return <DefaultOptions>{
      sdkVersion: TrackerConfig.version,
      historyTracker: false,
      hashTracker: false,
      domTracker: false,
      jsError: false
    }
  }
  // 重写history函数
  private rewriteHistoryFn() {
    window.history['pushState'] = createHistoryEvnent('pushState')
    window.history['replaceState'] = createHistoryEvnent('replaceState')
  }

  // 手动上报
  public sendTracker<T>(data: T) {
    this.reportTracker(data)
  }

  // 捕获事件，上报数据
  private captureEvents<T>(MouseEventList: string[], targetKey: string, data?: T) {
    MouseEventList.forEach(event => {
      window.addEventListener(event, () => {
        this.reportTracker({
          event,
          targetKey,
          data
        })
      })
    })
  }

  // 根据传参开启事件的捕获
  private installTracker() {
    if (this.data.historyTracker) {
      this.captureEvents(['pushState', 'replaceState', 'popstate'], 'histpry-pv')
    }
    if (this.data.hashTracker) {
      this.captureEvents(['hashchange'], 'hash-pv')
    }
    if (this.data.domTracker) {
      this.targetKeyReport()
    }
    if (this.data.jsError) {
      this.jsError()
    }
  }

  // 上报数据
  private reportTracker<T>(data: T) {
    const params = Object.assign(this.data, data, { time: new Date().getTime() })
    let headers = {
      type: 'application/x-www-form-urlencoded'
    };
    let blob = new Blob([JSON.stringify(params)], headers);
    console.log(blob);

    navigator.sendBeacon(this.data.requestUrl, blob)
  }

  public setUserId<T extends DefaultOptions['uuid']>(uuid: T) {
    this.data.uuid = uuid
  }
  public setExtra<T extends DefaultOptions['extra']>(extra: T) {
    this.data.extra = extra
  }

  private jsError() {
    this.errorEvent()
    this.promiseReject()
  }
  private errorEvent() {
    window.addEventListener('error', (event) => {
      this.reportTracker({
        event: 'error',
        targetKet: "error",
        message: event.message
      })
    })
  }

  private promiseReject() {
    window.addEventListener("unhandledrejection", (event) => {
      event.promise.catch(error => {
        this.reportTracker({
          event: 'promise',
          targetKet: "error",
          message: error
        })
      })
    })
  }

  private targetKeyReport() {
    MouseEventList.forEach(event => {
      window.addEventListener(event, (e) => {
        const target = e.target as HTMLElement
        const targetValue = target.getAttribute('target-key')
        if (targetValue) {
          this.sendTracker({
            targetKey: targetValue,
            event
          })
        }
      })
    })
  }
}
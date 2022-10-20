/**
 * @requestUrl 接口地址
 * @historyTracker history上报
 * @hashTracker hash上报
 * @domTracker 携带Tracker-key标识的dom元素，点击上报
 * @sdkVersion sdk版本号
 * @extra 上报的数据
 * @jsError js和promise异常上报
 */
export interface DefaultOptions {
  uuid: string | undefined,
  requestUrl: string | undefined,
  historyTracker: boolean,
  hashTracker: boolean,
  domTracker: boolean,
  sdkVersion: string | number,
  extra: Record<string, any> | undefined,
  jsError: boolean
}

export interface Options extends Partial<DefaultOptions>  {
  requestUrl: string
}

export enum TrackerConfig {
  version = '1.0.0'
}
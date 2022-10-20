// 捕获history事件，再自定义事件派发出去，已达到监听的目的
export const createHistoryEvnent = <T extends keyof History>(type: T): () => any => {
  const origin = history[type];
  return function (this: any) {
    const res = origin.apply(this, arguments)
    var e = new Event(type)
    window.dispatchEvent(e)
    return res;
  }
}
export class DataLoadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DataLoadError';
  }
}

export async function loadJson<T>(url: URL | string, parse: (value: unknown) => T): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new DataLoadError('学習データを取得できませんでした。通信状態を確認して、もう一度読み込んでください。', { cause: error });
  }

  if (!response.ok) {
    throw new DataLoadError(`学習データを取得できませんでした（${response.status}）。ページを再読み込みしてください。`);
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch (error) {
    throw new DataLoadError('学習データの形式を読み取れませんでした。ページを再読み込みしてください。', { cause: error });
  }

  try {
    return parse(value);
  } catch (error) {
    throw new DataLoadError('学習データが壊れているため表示を止めました。データを作り直してから再読み込みしてください。', { cause: error });
  }
}

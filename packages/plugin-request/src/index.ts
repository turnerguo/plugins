import { IApi } from 'umi';
import { join, dirname } from 'path';
import { readFileSync } from 'fs';

export interface RequestOptions {
  dataField?: string;
}

export default function(api: IApi) {
  const {
    paths,
    utils: { winPath },
  } = api;

  api.addRuntimePluginKey(() => 'request');

  // 配置
  api.describe({
    config: {
      schema(joi) {
        return joi.object({
          dataField: joi
            .string()
            .pattern(/^[a-zA-Z]*$/)
            .allow(''),
        });
      },
      default: {
        dataField: 'data',
      },
    },
  });

  const source = join(__dirname, '..', 'src', 'request.ts');
  const requestTemplate = readFileSync(source, 'utf-8');
  const namespace = 'plugin-request';

  api.onGenerateFiles(() => {
    const { dataField = 'data' } = api.config.request as RequestOptions;
    try {
      // Write .umi/plugin-request/request.ts
      let formatResultStr;
      if (dataField === '') {
        formatResultStr = 'formatResult: result => result';
      } else {
        formatResultStr = `formatResult: result => result?.${dataField}`;
      }
      api.writeTmpFile({
        path: `${namespace}/request.ts`,
        content: requestTemplate
          .replace(/\/\*FRS\*\/(.+)\/\*FRE\*\//, formatResultStr)
          .replace(/\['data'\]/g, dataField ? `['${dataField}']` : '')
          .replace(/data: T;/, dataField ? `${dataField}: T;` : '')
          .replace(
            /umi-request/g,
            winPath(dirname(require.resolve('umi-request/package'))),
          )
          .replace(
            /@umijs\/use-request/g,
            winPath(dirname(require.resolve('@umijs/use-request/package'))),
          )
          .replace(
            `import { ApplyPluginsType, history, plugin } from 'umi';`,
            `
import { ApplyPluginsType } from 'umi';
import { history, plugin } from '../core/umiExports';
            `,
          ),
      });
    } catch (e) {
      api.logger.error(e);
    }
  });

  api.addUmiExports(() => {
    return [
      {
        exportAll: true,
        source: `../${namespace}/request`,
      },
    ];
  });
}

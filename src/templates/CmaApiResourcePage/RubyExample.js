import React from 'react';
import Prism from 'prismjs';
import sortObject from 'sort-object';
import pluralize from 'pluralize';
import bem from 'utils/bem';

import 'prismjs/components/prism-ruby';

import schemaExampleFor from 'utils/schemaExampleFor';

import './HttpExample.sass';

const b = bem.lock('HttpExample');

const regexp = /{\(%2Fschemata%2F([^%]+)[^}]*}/g;

const methods = {
  instances: 'all',
  self: 'find',
};

function example(resource, link, allPages = false) {
  let params = [];
  let precode = [];

  let placeholders = [];
  let match = regexp.exec(link.href);

  while (match != null) {
    placeholders.push(match[1]);
    match = regexp.exec(link.href);
  }

  placeholders.forEach(placeholder => {
    precode.push(`${placeholder}_id = "43"`);
    params.push(`${placeholder}_id`);
  });

  const fix = string => string.replace(/": /g, '" => ').replace(/null/g, 'nil');

  const deserialize = (data, withId = false) => {
    const id = withId ? { id: data.id } : {};

    const attrs = {
      ...id,
      ...(sortObject(data.attributes) || {}),
      ...sortObject(
        Object.entries(data.relationships || {}).reduce(
          (acc, [name, value]) => {
            acc[name] = value.data ? value.data.id : null;
            return acc;
          },
          {},
        ),
      ),
    };

    return attrs;
  };

  if (link.hrefSchema) {
    const example = schemaExampleFor(link.hrefSchema, !allPages);
    params.push(fix(JSON.stringify(example, null, 2)));

    if (allPages && link.targetSchema && link.targetSchema.properties.meta) {
      params.push(fix(JSON.stringify({ all_pages: true }, null, 2)));
    }
  }

  if (link.schema) {
    const example = schemaExampleFor(link.schema, !allPages);

    if (example.data) {
      params.push(fix(JSON.stringify(deserialize(example.data), null, 2)));
    }
  }

  const namespace = resource.links.find(l => l.rel === 'instances')
    ? pluralize(resource.id)
    : resource.id;

  let call = `client.${namespace}.${methods[link.rel] || link.rel}`;
  if (params.length > 0) {
    if (allPages) {
      call += `(\n${params.join(',\n').replace(/^/gm, '  ')}\n)`;
    } else {
      call += `(${params.join(', ')})`;
    }
  }

  let returnCode = '';
  let output;

  if (link.targetSchema) {
    const example = schemaExampleFor(link.targetSchema);
    const variable = resource.id;

    if (Array.isArray(example.data)) {
      output = JSON.stringify(deserialize(example.data[0], true), null, 2)
        .replace(/": /g, '" => ')
        .replace(/null/g, 'nil');

      returnCode = `${call}.each do |${variable}|
  puts ${variable}.inspect
end`;
    } else {
      output = JSON.stringify(deserialize(example.data, true), null, 2)
        .replace(/": /g, '" => ')
        .replace(/null/g, 'nil');
      returnCode = `${variable} = ${call}

puts ${variable}.inspect
`;
    }
  }

  if (!allPages) {
    const code = `require "dato"
client = Dato::Site::Client.new("YOUR-API-KEY")
${precode.length > 0 ? '\n' : ''}${precode.join('\n')}${
      precode.length > 0 ? '\n' : ''
    }
${returnCode}
${
  link.targetSchema && link.targetSchema.properties.meta
    ? '\n\n# if you want to fetch all the pages with just one call:\n\n' +
      example(resource, link, true).code
    : ''
}`;
    return { code, output };
  } else {
    return { code: returnCode, output };
  }
}

function renderExample(example, requestCode, responseCode) {
  return (
    <div className={b()}>
      {example.title &&
        <h6 className={b('title')}>{example.title}</h6>
      }
      <div className={b('snippet')}>
        <pre className="language-ruby">
          <code
            dangerouslySetInnerHTML={{
              __html: Prism.highlight(
                example.request || requestCode,
                Prism.languages.ruby,
              ),
            }}
          />
        </pre>
      </div>
      <div className={b('snippet')}>
        <div className={b('snippet__title')}>
          Result
        </div>
        <pre className="language-ruby">
          <code
            dangerouslySetInnerHTML={{
              __html: Prism.highlight(
                example.response || responseCode,
                Prism.languages.ruby,
              ),
            }}
          />
        </pre>
      </div>
    </div>
  );
}

export default function RubyExample({ resource, link }) {
  const { code, output } = example(resource, link);

  const outputWithRun = `> ruby example.rb\n\n${output}`;

  if (link.examples && link.examples.ruby) {
    return link.examples.ruby.map(example =>
      renderExample(example, code, outputWithRun),
    );
  }

  return renderExample({}, code, outputWithRun);
}

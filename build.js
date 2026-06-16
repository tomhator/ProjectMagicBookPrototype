/* build.js — 분리 소스(styles.css, data/score/app.js)를 단일 실행 파일 play.html로 인라인.
   사용법: node build.js
   play.html은 htmlpreview.github.io 등에서 빌드/서버 없이 바로 렌더링하기 위한 산출물입니다. */
const fs = require('fs');

const css = fs.readFileSync('styles.css', 'utf8');
const js = ['data.js', 'score.js', 'app.js']
  .map(f => fs.readFileSync(f, 'utf8')).join('\n\n');

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(
  /<link rel="stylesheet" href="styles.css" \/>/,
  '<style>\n' + css + '\n</style>'
);
html = html.replace(
  /<script src="data.js"><\/script>\s*<script src="score.js"><\/script>\s*<script src="app.js"><\/script>/,
  '<script>\n' + js + '\n</script>'
);
html = html.replace(
  '</title>',
  '</title>\n  <!-- 자동 생성 파일: node build.js. 소스는 분리 파일(index.html, styles.css, *.js)을 수정하세요. -->'
);

fs.writeFileSync('play.html', html);
console.log('play.html 생성 완료.');

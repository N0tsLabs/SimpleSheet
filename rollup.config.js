import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import postcssImport from 'postcss-import';

const banner = `/*!
 * @n0ts123/simple-sheet v0.1.0
 * (c) ${new Date().getFullYear()}
 * Released under the MIT License.
 */`;

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/simple-sheet.esm.js',
      format: 'esm',
      banner,
      sourcemap: true,
    },
    {
      file: 'dist/simple-sheet.cjs.js',
      format: 'cjs',
      banner,
      sourcemap: true,
      exports: 'named',
    },
    {
      file: 'dist/simple-sheet.umd.js',
      format: 'umd',
      name: 'SimpleSheet',
      banner,
      sourcemap: true,
      exports: 'named',
    },
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist',
    }),
    postcss({
      extract: 'simple-sheet.css',
      minimize: true,
      plugins: [
        postcssImport(),
      ],
    }),
  ],
};


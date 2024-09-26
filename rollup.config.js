const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve');
const typescript = require('rollup-plugin-typescript2');
const json = require('@rollup/plugin-json');
const terser  = require('@rollup/plugin-terser'); // Make sure to import terser correctly


module.exports = {
    input: 'index.ts',  // Adjust path if necessary
    output: {
      file: 'dist/clickstream.umd.js',  // Output bundle file
      format: 'umd',  // UMD format
      name: 'Clickstream',  // Global variable name
      sourcemap: true,  // Generate sourcemap for debugging
    },
   
    plugins: [
      resolve({
        browser: true,  // Resolve modules for browser environments
        preferBuiltins: false,  // Prevent Rollup from prioritizing Node.js built-ins for the browser
      }),  
      commonjs({
        include: ['node_modules/**','node_modules/@gofynd/fp-signature/**'], 
        sourceMap: true,
       
      }),
      json(),  // Convert CommonJS to ES6
      typescript({ tsconfig: './tsconfig.json' }),  // Use tsconfig
      terser()  // Minify the output,
    ]
  };
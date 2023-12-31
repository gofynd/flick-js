'use strict';

import  fs from 'fs';

let rawdata = fs.readFileSync('coverage/coverage-summary.json');
let coverageReport = JSON.parse(rawdata);
var coverageResult = {
    coverage_pct: coverageReport.total.lines.pct,
    lines_total: coverageReport.total.lines.total,
    lines_covered: coverageReport.total.lines.covered,
    branch_pct: coverageReport.total.branches.pct,
    branches_covered: coverageReport.total.branches.covered,
    branches_total: coverageReport.total.branches.total
}
let data = JSON.stringify(coverageResult);
fs.writeFileSync('coverage_output.json', data);
export NODE_ENV=test
export MODE=server

rm -rf ./coverage

npm test
node TestCoverageGenerator.mjs

cp ./coverage_output.json /mnt/artifacts/

# echo "{
#     \"coverage_pct\": 80,
#     \"lines_total\": 4000,
#     \"lines_covered\": 5000,
#     \"branch_pct\": 80,
#     \"branches_covered\": 800,
#     \"branches_total\": 1000
# }" > $artifacts_dir/coverage_output.json

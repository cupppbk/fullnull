﻿# This workflow will do a clean install of node dependencies, build the source code and run tests across different versions of node
# For more information see: https://help.github.com/actions/language-and-framework-guides/using-nodejs-with-github-actions

name: 京东粉丝专享

on:
  workflow_dispatch:
  schedule:
    - cron: '10 */3 * * *'
  watch:
    types: started
  repository_dispatch:
    types: jd_scripts
jobs:
  build:
    runs-on: ubuntu-latest
    if: github.event.repository.owner.id == github.event.sender.id
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v1
        with:
          node-version: ${{ matrix.node-version }}
      - name: Cache node_modules
        uses: actions/cache@v2 # 使用 GitHub 官方的缓存 Action。
        env:
          cache-name: cache-node-modules
        with:
          path: node_modules
          key: ${{ runner.os }}-${{ env.cache-name }}-${{ hashFiles('package-lock.json') }} # 使用 package-lock.json 的 Hash 作为缓存的 key。也可以使用 package.json 代替
      - name: npm install
        run: |
          npm install
      - name: '运行 【京东粉丝专享】'
        run: |
          node jd_wechat_sign.js
        env:
          JD_COOKIE: ${{ secrets.JD_COOKIE }}
          JD_DEBUG: ${{ secrets.JD_DEBUG }}
          TG_BOT_TOKEN: ${{ secrets.TG_BOT_TOKEN }}
          TG_USER_ID: ${{ secrets.TG_USER_ID }}
          JD_818_SHAREID_NOTIFY: ${{ secrets.JD_818_SHAREID_NOTIFY }}

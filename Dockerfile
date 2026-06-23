# 使用輕量的 Node.js 18 Alpine 版本
FROM node:18-alpine

# 設定工作目錄
WORKDIR /usr/src/app

# 複製 package 檔案
COPY package*.json ./

# 僅安裝正式環境需要的套件 (排除 devDependencies)
RUN npm install --omit=dev

# 複製專案原始碼
COPY . .

# 設定環境變數的預設值 (建議在執行容器時透過 -e 或是 --env-file 覆蓋)
ENV NODE_ENV=production

# 啟動應用程式
CMD ["npm", "start"]

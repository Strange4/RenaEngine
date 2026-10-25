# Based on the c# ASP .NET Core dockerfile from learn.microsoft.com

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /game-server

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    protobuf-compiler=3.21.12-8.2ubuntu0.4 \
    nodejs=18.19.1+dfsg-6ubuntu5 \
    npm=9.2.0~ds1-2 \
    && rm -rf /var/lib/apt/lists/*

# typescript dependencies for building .zip
COPY Rena/generated/typescript/sdk-tools/package.json Rena/generated/typescript/sdk-tools/package-lock.json /sdk-tools/
RUN npm ci --prefix /sdk-tools

# copy csproj and restore as distinct layers
COPY game-server.slnx .
COPY BattleshipServer/BattleshipServer.csproj ./BattleshipServer/
COPY Rena/Rena.csproj ./Rena/
RUN dotnet restore ./BattleshipServer && dotnet restore ./Rena

# copy the files for the project
COPY BattleshipServer/ ./BattleshipServer/
COPY Rena/ ./Rena/

WORKDIR /game-server/BattleshipServer

ARG RenaOptions__TSProtoPath
ARG RenaOptions__GenerationDirectory

RUN dotnet publish -c release -o /app \
    && dotnet /app/BattleshipServer.dll --generate

# final stage/image
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app /app/
COPY --from=build /sdks /sdks/
COPY docker/entrypoint.sh ./entrypoint.sh
USER app
ENTRYPOINT ["./entrypoint.sh"]

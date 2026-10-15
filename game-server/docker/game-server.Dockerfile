# Based on the c# ASP .NET Core dockerfile from learn.microsoft.com

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /game-server

RUN apt-get update \
    && apt-get install -y protobuf-compiler nodejs npm \
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

RUN dotnet publish -c release -o /app --no-restore \
    && dotnet /app/BattleshipServer.dll --generate

# final stage/image
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app /app/
COPY --from=build /sdks /sdks/
COPY docker/entrypoint.sh ./entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]

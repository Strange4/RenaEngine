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
COPY battleship-server/battleship-server.csproj ./battleship-server/
COPY Rena/Rena.csproj ./Rena/
RUN dotnet restore ./battleship-server && dotnet restore ./Rena

# copy the files for the project
COPY battleship-server/ ./battleship-server/
COPY Rena/ ./Rena/

WORKDIR /game-server/battleship-server

# Configuration variables for docker specific stuff
ENV RenaOptions__TSProtoPath="/sdk-tools/node_modules/ts-proto/protoc-gen-ts_proto"
ENV RenaOptions__GenerationDirectory="/sdks"

RUN dotnet publish -c release -o /app --no-restore \
    && dotnet /app/battleship-server.dll --generate

# final stage/image
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app /app/
COPY --from=build /sdks /sdks/
COPY docker/entrypoint.sh ./entrypoint.sh
ENV RenaOptions__GenerationDirectory="/sdks"
ENV RenaOptions__TSProtoPath="/sdk-tools/node_modules/ts-proto/protoc-gen-ts_proto"
ENTRYPOINT ["./entrypoint.sh"]

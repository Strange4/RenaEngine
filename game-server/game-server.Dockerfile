# Based on the c# ASP .NET Core dockerfile from learn.microsoft.com

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /game-server

# copy csproj and restore as distinct layers
COPY *.sln .
COPY src/*.csproj ./src/
RUN dotnet restore ./src

# copy everything else and build app
COPY src/. ./src/
WORKDIR /game-server/src
RUN dotnet publish -c release -o /app --no-restore

# final stage/image
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app ./
ENTRYPOINT ["./game-server"]
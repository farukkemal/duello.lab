# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["DuelloLab.Api.csproj", "./"]
RUN dotnet restore "DuelloLab.Api.csproj"

# Copy full source and build
COPY . .
RUN dotnet build "DuelloLab.Api.csproj" -c Release -o /app/build

# Publish Stage
FROM build AS publish
RUN dotnet publish "DuelloLab.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Production Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 5000

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "DuelloLab.Api.dll"]

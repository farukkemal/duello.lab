# ==============================================================================
# duello.lab - Root Dockerfile for Render Web Service Deployment
# ==============================================================================

# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["backend/DuelloLab.Api/DuelloLab.Api.csproj", "backend/DuelloLab.Api/"]
RUN dotnet restore "backend/DuelloLab.Api/DuelloLab.Api.csproj"

# Copy backend source and build
COPY backend/DuelloLab.Api/ backend/DuelloLab.Api/
WORKDIR /src/backend/DuelloLab.Api
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
ENV DOTNET_USE_POLLING_FILE_WATCHER=true
ENV DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE=false

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "DuelloLab.Api.dll"]

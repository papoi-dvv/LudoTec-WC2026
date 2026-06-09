# Contenerización, Escalado y Pruebas

Este documento recopila pasos prácticos para:

- Contenerizar la aplicación con Docker.
- Escalar horizontalmente y configurar balanceo de carga (recomendación: Kubernetes).
- Ejecutar y documentar pruebas, incluyendo pruebas de estrés con `k6`.

**Notas:** adapta los nombres de imagen/etiqueta y dominios a tu infraestructura.

## 1) Contenerización con Docker

- Verifica los `Dockerfile` existentes en el repositorio:
  - [backend/Dockerfile](backend/Dockerfile)
  - [frontend/Dockerfile](frontend/Dockerfile)

- Construir imágenes localmente:

```bash
# Backend
docker build -t your-registry/ludotec-backend:latest -f backend/Dockerfile backend

# Frontend
docker build -t your-registry/ludotec-frontend:latest -f frontend/Dockerfile frontend
```

- Ejecutar con `docker run` o con `docker-compose` (siguiente sección).

## 2) Uso de `docker-compose` para pruebas locales

- En desarrollo puedes reutilizar `docker-compose.yml` en la raíz del repo. Ejemplos de comandos:

```bash
# Levantar servicios
docker-compose up --build

# Levantar con réplicas (Compose v2+ permite --scale)
docker-compose up --build --scale backend=3

# Levantar en background
docker-compose up -d --build

# Parar y borrar
docker-compose down
```

Nota: `docker-compose` es útil para testing local; para producción y verdadero escalado horizontal, usar Kubernetes.

## 3) Despliegue, escalado y balanceo (Kubernetes)

Recomendación: usar Kubernetes para producción. A continuación tienes ejemplos mínimos.

Ejemplo: `deployment-backend.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ludotec-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ludotec-backend
  template:
    metadata:
      labels:
        app: ludotec-backend
    spec:
      containers:
      - name: backend
        image: your-registry/ludotec-backend:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        env:
        - name: NODE_ENV
          value: production
```

Servicio interno (`service-backend.yaml`):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ludotec-backend
spec:
  selector:
    app: ludotec-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

Ingress (usando NGINX Ingress Controller):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ludotec-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:
  - host: ludotec.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ludotec-frontend
            port:
              number: 80

  # Puedes añadir reglas para la API (backend) en un subpath o subdominio
```

Horizontal Pod Autoscaler (HPA) ejemplo:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ludotec-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ludotec-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
```

Comandos básicos:

```bash
# Aplicar manifiestos
kubectl apply -f deployment-backend.yaml
kubectl apply -f service-backend.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml

# Escalar manualmente
kubectl scale deployment ludotec-backend --replicas=5

# Ver estado
kubectl get pods,svc,hpa -l app=ludotec-backend
```

## 4) Balanceo de carga

- En Kubernetes, el `Service` + `Ingress` + controlador de Ingress (NGINX/Traefik) manejan el balanceo.
- Si despliegas en un proveedor cloud, usa el LoadBalancer del proveedor para tráfico externo.
- Revisa `nginx/nginx.conf` en el repo si prefieres un NGINX tradicional: [nginx/nginx.conf](nginx/nginx.conf)

## 5) Pruebas y stress testing

Hay un script de ejemplo en `stress/k6-smoke.js`. Úsalo con `k6`.

Instalar `k6` (Linux):

```bash
# Using apt (Ubuntu/Debian)
sudo apt install -y gnupg software-properties-common
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 8E5B6C6F
sudo add-apt-repository https://dl.k6.io/deb
sudo apt update && sudo apt install k6

# O usar binarios desde https://k6.io/docs/
```

Ejecutar prueba de estrés:

```bash
# Prueba básica
k6 run --vus 50 --duration 30s stress/k6-smoke.js

# Guardar resultados en JSON
k6 run --vus 200 --duration 60s --out json=results.json stress/k6-smoke.js

# Resumen y conversión (puedes usar herramientas para visualizar JSON)
```

Variables a documentar por cada ejecución:

- Objetivo de la prueba
- Fecha/hora y entorno (k8s cluster, docker-compose, tamaño de máquinas)
- Comando exacto ejecutado
- Número de VUs, duración, ramp-up
- Latencias: p50, p95, p99
- Throughput (req/s)
- Errores (cuentas y tipos)
- Uso de CPU/Memory de pods/instancias durante la prueba

Herramientas adicionales: `wrk`, `ab`, `locust` o soluciones SaaS (Loader.io, k6 Cloud).

## 6) Plantilla para documentación de pruebas

- `docs/test-results/<fecha>-stress-result.json` (guardar raw output)
- `docs/test-results/<fecha>-summary.md` con la siguiente plantilla:

```
Título: Prueba de estrés - <breve descripción>
Fecha: YYYY-MM-DD
Entorno: (docker-compose / k8s cluster - versión)
Comando: (línea exacta)
VUs: N
Duración: Xm

Resultados:
- p50: X ms
- p95: Y ms
- p99: Z ms
- Throughput: T req/s
- Errores: E (descripción)

Observaciones:
- Notas sobre cuellos de botella, escalado automático, recomendaciones.
```

Guarda los artefactos (JSON, CSV, capturas de métricas de Prometheus/Grafana) en `docs/test-results/`.

## 7) Monitoreo recomendado

- Prometheus + Grafana para métricas de aplicación y cluster.
- Exportadores: `node_exporter`, `kube-state-metrics`, `metrics-server` (para HPA).

## 8) Pasos siguientes (acciones que puedo hacer por ti)

1. Actualizar/validar los `Dockerfile` del backend y frontend.
2. Generar manifiestos Kubernetes personalizados con las imágenes del repo.
3. Ejecutar una prueba `k6` contra tu entorno y subir resultados a `docs/test-results/`.

Indica qué pasos quieres que haga ahora y los realizo.

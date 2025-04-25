# dsata Kubernetes + Docker Setup

## 🚀 Setup Instructions (Local Dev with Minikube)

### 📦 Requirements
- Docker Desktop
- Minikube
- kubectl

### ✅ 1. Start Minikube
```bash
minikube start
```

### 🔄 2. Point Docker to Minikube
```bash
minikube -p minikube docker-env
```

### ⚙️ 3. Deploy Everything
```bash
minikube start -p dsata
minikube profile dsata 
minikube -p minikube docker-env
kubectl config use-context dsata
kubectl create namespace dsata
kubectl config set-context --current --namespace=dsata
.\scripts\deploy_win.bat
```
> This script builds images, deletes and reapplies all manifests, and shows you the service IPs

### 🌍 4. Access the App
- App: `http://dsata.local` or the LoadBalancer IP for `frontend`
- Frontend: `localhost:81`
- Backend: `localhost:80`
- Grafana: `localhost:3000`
- Prometheus: `localhost:9090`
- Kafdrap: `localhost:9000`


### 🧪 5. Check Status
```bash
kubectl get pods
kubectl get svc
kubectl get ingress
kubectl describe podht
```

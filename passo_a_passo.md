# Criação dos Nodes

Foi criado o cluster com pelo menos 3 nodes utilizando o comando:

```bash
minikube start -p laboratorio --nodes 3
```

# Habilitar os addons ingress e metrics-server.

```sh
minikube -p laboratorio addons enable ingress
minikube -p laboratorio addons enable metrics-server
```

# Criar a imagem da API com Dockerfile e publicar no Docker Hub.

Build da aplicação:

```bash
docker build -t kubernets-minikube:1.0 .
```

Login no Docker Hub:

```bash
docker login
```

Tag da imagem e push para o Docker Hub:

```bash
docker tag kubernets-minikube:1.0 gabrielduarter/kubernets-minikube:1.0
docker push gabrielduarter/kubernets-minikube:1.0
```

# Criar os namespaces dev e hom.

Entrar na pasta do k8s e executar o namespaces.yml:

```bash
kubectl --context=laboratorio apply -f namespaces.yaml
```

Para validar:

```bash
kubectl --context=laboratorio get namespaces
```

Resultado:

```plain
 kubectl --context=laboratorio get namespaces
NAME              STATUS   AGE
default           Active   30m
dev               Active   14s
hom               Active   14s
ingress-nginx     Active   12m
kube-node-lease   Active   30m
kube-public       Active   30m
kube-system       Active   30m
```

# Criar em cada names

## um Deployment com RollingUpdate configurado (dev com 1 réplica e hom com 2);
## requests e limits de CPU e memória nos containers;
## livenessProbe e readinessProbe;

Entre o k8s e aplique o deployment-dev.yaml:

```bash
kubectl --context=laboratorio -n dev apply -f deployment.yaml
kubectl --context=laboratorio -n hom apply -f deployment.yaml
kubectl --context=laboratorio -n hom scale deployment kubernets-minikube --replicas=2
```

## Config e Secret

```bash
kubectl --context=laboratorio -n dev apply -f config/dev.yaml
kubectl --context=laboratorio -n hom apply -f config/qas.yaml

kubectl --context=laboratorio -n dev apply -f secrets/dev.yaml
kubectl --context=laboratorio -n hom apply -f secrets/qas.yaml
```

Validar se foram criadas:

```bash
kubectl --context=laboratorio -n dev get configmaps,secrets
kubectl --context=laboratorio -n hom get configmaps,secrets
```

## um Service do tipo ClusterIP;

```sh
kubectl --context=laboratorio -n dev apply -f service.yaml
kubectl --context=laboratorio -n hom apply -f service.yaml
```

Para testar o service:

```bash
kubectl --context=laboratorio -n dev port-forward service/kubernets-minikube-service 8082:80
```

## um Ingress com host próprio (dev.local e hom.local);

```bash

APP_HOST=dev.local envsubst '${APP_HOST}' < ingress.yaml |
  kubectl --context=laboratorio -n dev apply -f -

APP_HOST=hom.local envsubst '${APP_HOST}' < ingress.yaml |
  kubectl --context=laboratorio -n hom apply -f -

```

## um ResourceQuota limitando a quantidade de pods, CPU e memória;

```bash
kubectl --context=laboratorio -n dev apply -f quota.yaml
kubectl --context=laboratorio -n hom apply -f quota.yaml
```

Para validar:

```bash
kubectl --context=laboratorio -n dev describe resourcequota kubernets-minikube-quota
kubectl --context=laboratorio -n hom describe resourcequota kubernets-minikube-quota
```

## um HorizontalPodAutoscaler com alvo de 60% de CPU.

```bash
MIN_REPLICAS=1 envsubst '${MIN_REPLICAS}' < horizontalPodAutoscaler.yaml |
  kubectl --context=laboratorio -n dev apply -f -

MIN_REPLICAS=2 envsubst '${MIN_REPLICAS}' < horizontalPodAutoscaler.yaml |
  kubectl --context=laboratorio -n hom apply -f -
```

Para habilitar:

```bash
minikube -p laboratorio addons enable metrics-server
```

Para validar:

```bash
kubectl --context=laboratorio -n dev top pods
kubectl --context=laboratorio -n dev get hpa -w
```

### Colocar labels nos nodes e usar nodeAffinity para os pods de dev e de hom rodarem em nodes diferentes.

Aplique:

```bash
kubectl --context=laboratorio label nodes laboratorio-m02 role=dev
kubectl --context=laboratorio label nodes laboratorio-m06 role=hom
```

>> Use os nomes dos nodes que você criou no seu cluster.

Para validar:

```bash
kubectl --context=laboratorio get nodes  -L ambiente
```

Para o node affinity, aplique:

```bash
AMBIENTE=dev envsubst '${AMBIENTE}' < deployment.yaml |
  kubectl --context=laboratorio -n dev apply -f -

AMBIENTE=hom envsubst '${AMBIENTE}' < deployment.yaml |
  kubectl --context=laboratorio -n hom apply -f -
```

Para validar:

```bash
kubectl --context=laboratorio -n dev get pods -o wide
kubectl --context=laboratorio -n hom get pods -o wide
```

## Gerar carga na API e mostrar o HPA escalando os pods.

Execute o comando para gerar carga:

```bash
kubectl --context=laboratorio -n dev delete pod gerador-carga --ignore-not-found
kubectl --context=laboratorio -n dev apply -f gerador-carga.yaml
```

E o comando para monitorar:

```bash
kubectl --context=laboratorio -n dev logs -f gerador-carga
```

## Apagar um pod e mostrar que o Kubernetes recria ele sozinho (self healing).

Use o comando abaixo para apagar um pod:

```bash
kubectl --context=laboratorio -n dev delete pod  kubernets-minikube-5bd9c9bd96-cpxsd
```

E esse para monitorar se o pod foi recriado:

```bash
kubectl --context=laboratorio -n dev get pods -w
```
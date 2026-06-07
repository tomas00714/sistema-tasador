from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import TasacionLoteRequest, TasacionDepartamentoRequest
from tasador_lotes import tasar_lote
from tasador_departamentos import tasar_departamento

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"mensaje": "Servidor funcionando"}


@app.post("/tasar/lote")
def endpoint_tasar_lote(datos: TasacionLoteRequest):

    print("DEBUG: Iniciando endpoint_tasar_lote")

    try:

        resultado = tasar_lote(datos)

        print("DEBUG: Finalizando endpoint_tasar_lote")

        return resultado

    except ValueError as e:

        print(f"DEBUG: ValueError en endpoint: {e}")

        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@app.post("/tasar/departamento")
def endpoint_tasar_departamento(datos: TasacionDepartamentoRequest):

    print("DEBUG: Iniciando endpoint_tasar_departamento")

    try:

        resultado = tasar_departamento(datos)

        print("DEBUG: Finalizando endpoint_tasar_departamento")

        return resultado

    except ValueError as e:

        print(f"DEBUG: ValueError en endpoint: {e}")

        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

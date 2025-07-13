from fastapi import APIRouter

# Test different router patterns
app_router = APIRouter()
wallet_router = APIRouter()
public_dev_router = APIRouter()

@app_router.get('/simple')
async def simple_get():
    return {"message": "simple"}

@wallet_router.post('/create-payment')
async def create_payment():
    return {"status": "created"}

@public_dev_router.get("/health-check")
async def health_check():
    return {"status": "ok"}

@wallet_router.put('/update/{item_id}')
def update_item(item_id: int):
    return {"updated": item_id}

@app_router.delete("/delete/{item_id}")
def delete_item(item_id: int):
    return {"deleted": item_id}

@public_dev_router.patch('/patch-item')
async def patch_item():
    return {"patched": True} 
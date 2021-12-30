# Imports
from tensorflow import keras
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import pickle
import pandas as pd
import numpy as np
import random
import aioredis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache

# Util Functions
def get_age_group(age):
    if not age or age <= 0 or age >= 65:
        return "UNKNOWN"
    elif age < 18:
        return "<18"
    elif age >= 18 and age <= 24:
        return "18-24"
    elif age >= 25 and age <= 44:
        return "25-44"
    else:
        return "45-64"

def normalize(feature: str, value: float):
    liste = min_max_dict[feature]
    return ((value-liste[0])/(liste[1]-liste[0]))

# ignore warnings
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

# Instantiate FastAPI
app = FastAPI()

# Add CORS Support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import AI Model
crime_model = keras.models.load_model('data/model.h5')
pd_cd_model = pickle.load(open('data/PD_CD_predict.h5', 'rb'))

# Import dictionaries
min_max_dict = pickle.load(open('data/dict_min_max.pickle', 'rb'))
vic_sex_dict = pickle.load(open('data/VIC_SEX_dict.pickle', 'rb'))
vic_race_dict = pickle.load(open('data/VIC_RACE_dict.pickle', 'rb'))
vic_age_group_dict = pickle.load(open('data/VIC_AGE_GROUP_dict.pickle', 'rb'))
patrol_dict = pickle.load(open('data/patrol_dict.pickle', 'rb'))
boro_nm_dict = pickle.load(open('data/BORO_NM_dict.pickle', 'rb'))

# Import target (label) dictionary and invert it 
target_dict = pickle.load(open('data/Target_dict.pickle', 'rb'))
label_dict = dict()
for key,value in target_dict.items():
    # print(value, key)
    label_dict[value]=key

@app.get("/crime")
@cache(expire=3600)
async def read_root(age: int, sex: str, race: str, datetime: float, lat: float, long: float, borough: str, patrol_borough: str, precinct: float):
    if not (age and sex and race and datetime and lat and long and borough and patrol_borough and precinct):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)

    age_group = get_age_group(age)

    [PATROL_BORO_0, PATROL_BORO_1, PATROL_BORO_2,
        PATROL_BORO_3] = patrol_dict[patrol_borough]
    [BORO_NM0, BORO_NM1, BORO_NM2] = boro_nm_dict[borough]
    [VIC_SEX_0, VIC_SEX_1, VIC_SEX_2] = vic_sex_dict[sex]
    [VIC_RACE_0, VIC_RACE_1, VIC_RACE_2, VIC_RACE_3] = vic_race_dict[race]
    [VIC_AGE_GROUP_0, VIC_AGE_GROUP_1, VIC_AGE_GROUP_2] = vic_age_group_dict[age_group]
    ADDR_PCT_CD = normalize("ADDR_PCT_CD", precinct)
    DATETIME = normalize("DateTime", datetime)
    LATITUDE = normalize("Latitude", lat)
    LONGITUDE = normalize("Longitude", long)

    observation = pd.DataFrame([PATROL_BORO_0, PATROL_BORO_1, PATROL_BORO_2, PATROL_BORO_3,
                                BORO_NM0, BORO_NM1, BORO_NM2, VIC_AGE_GROUP_0, VIC_AGE_GROUP_1, VIC_AGE_GROUP_2,
                                VIC_SEX_0, VIC_SEX_1, VIC_SEX_2, VIC_RACE_0, VIC_RACE_1, VIC_RACE_2, VIC_RACE_3,
                                ADDR_PCT_CD, LATITUDE, LONGITUDE, DATETIME])
    observation = pd.DataFrame(np.reshape(np.array(observation), (observation.shape[0], 1)))
    observation = observation.transpose()

    PD_CD = pd_cd_model.predict(observation)[0][0]
    PD_CD = random.random()

    observation = pd.DataFrame([PATROL_BORO_0, PATROL_BORO_1, PATROL_BORO_2, PATROL_BORO_3,
                                BORO_NM0, BORO_NM1, BORO_NM2, VIC_AGE_GROUP_0, VIC_AGE_GROUP_1, VIC_AGE_GROUP_2,
                                VIC_SEX_0, VIC_SEX_1, VIC_SEX_2, VIC_RACE_0, VIC_RACE_1, VIC_RACE_2, VIC_RACE_3,
                                PD_CD, ADDR_PCT_CD, LATITUDE, LONGITUDE, DATETIME])
    observation = pd.DataFrame(np.reshape(np.array(observation), (observation.shape[0], 1)))
    observation = observation.transpose()
    
    crime = np.argmax(crime_model.predict(observation)[0])

    crime = label_dict[crime]

    return {"crime": crime}

@app.on_event("startup")
async def startup():
    redis =  aioredis.from_url("redis://localhost", encoding="utf8", decode_responses=True)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")

# to run use the command: uvicorn main:app --reload
import streamlit as st
import folium
from folium.plugins import MousePosition
from streamlit_folium import folium_static

nypd_sectors = 'assets/geojson/NYPD_Sectors.geojson'
nypd_psa = 'assets/geojson/NYCHA_PSA.geojson'

m = folium.Map(
    location=[40.730610, -73.935242],
    tiles='OpenStreetMap',
    zoom_start=10
)

formatter = "function(num) {return L.Util.formatNum(num, 3) + ' º ';};"

MousePosition(
    position="topright",
    separator=" | ",
    empty_string="NaN",
    lng_first=True,
    num_digits=20,
    prefix="Coordinates:",
    lat_formatter=formatter,
    lng_formatter=formatter,
).add_to(m)

folium.GeoJson(nypd_psa, name='NYPCHA PSA', 
    tooltip=folium.GeoJsonTooltip(['address', 'borough', 'psa', 'zipcode'],
    aliases=['Address', 'Borough', 'PSA', 'Zipcode'])).add_to(m)

folium.GeoJson(nypd_sectors, name='NYPD Sectors', 
    popup=folium.GeoJsonPopup(['sct_text', 'patrol_bor', 'sq_mile_new'],
    aliases=['Sector', 'Patrol Borough', 'Surface in Square Miles'])).add_to(m)

folium.LayerControl().add_to(m)

title = 'Crime Prediction in New York City'

st.set_page_config(page_title=title)
st.title(title)

date = st.date_input('Select a date:')
sex = st.selectbox('Select your sex:', ['Male', 'Female'])
age = st.select_slider('Selct your age:', options=range(13, 80), value=24)

st.text('Select your accident position:')
map = folium_static(m)

if st.button('Predict Accident'):
    st.text('accident predicted!')
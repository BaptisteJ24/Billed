/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom"
import { ROUTES_PATH } from "../constants/routes.js"
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import router from "../app/Router.js";
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"

jest.mock("../app/Store", () => mockStore)

window.alert = jest.fn()
let onNavigate = jest.fn()

describe("Given I am connected as an employee", () => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  window.localStorage.setItem('user', JSON.stringify({
    type: 'Employee'
  }))

  describe("When I am on NewBill Page", () => {
    beforeEach(() => {
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.NewBill)
      const html = NewBillUI()
      document.body.innerHTML = html
    })
    test("Then form should be display", () => {
      const form = screen.getByTestId("form-new-bill")
      expect(form).toBeTruthy()
    })
    describe("When I click on load file and upload a file", () => {
      test("Then shouldn't uploaded a file at the wrong format", async () => {
        const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage })
        const handleChangeFile = jest.fn(newBill.handleChangeFile)
        const file = new File(['facturefreemobile.pdf'], 'facturefreemobile.pdf', { type: 'application/pdf' })
        const fileInput = screen.getByTestId("file")
        fileInput.addEventListener("change", handleChangeFile)
        fireEvent.change(fileInput, { target: { files: [file] } })
        await waitFor(() => expect(handleChangeFile).toHaveBeenCalled())
        expect(window.alert).toHaveBeenCalledWith("Le format du fichier n'est pas valide. Veuillez sélectionner un fichier au format jpg, jpeg ou png.") // alert is called     
        expect(Object.keys(fileInput.files[0]).length).toBe(0); // file is not uploaded
      })
      test("Then uploaded file should be at the right format", () => {
        const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage })
        const handleChangeFile = jest.fn(newBill.handleChangeFile)
        const file = new File(['facturefreemobile.jpg'], 'facturefreemobile.jpg', { type: 'image/jpg' })
        const fileInput = screen.getByTestId("file")
        fileInput.addEventListener("change", handleChangeFile)
        fireEvent.change(fileInput, { target: { files: [file] } })
        expect(handleChangeFile).toHaveBeenCalled()
        expect(fileInput.files[0].name).toBe(file.name)
      })
    })

    describe("When the form is submitted", () => {
      test("Then should not submit the form if the file is not uploaded", () => {
        const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage })
        const handleSubmit = jest.fn(newBill.handleSubmit)
        const form = screen.getByTestId("form-new-bill")
        form.addEventListener("submit", handleSubmit)
        fireEvent.submit(form)
        expect(handleSubmit).toHaveBeenCalled()
        expect(window.alert).toHaveBeenCalledWith("Veuillez soumettre le fichier avant de continuer.") // alert is called
      })
    })
  })
})

// Integration test POST
describe("Given I am a user connected as Employee", () => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  window.localStorage.setItem('user', JSON.stringify({
    type: 'Employee',
    email: 'e@e'
  }))
  describe("When I want to create a new bill", () => {
    const root = document.createElement("div")
    root.setAttribute("id", "root")
    document.body.innerHTML = root.outerHTML
    router()
    window.onNavigate(ROUTES_PATH.NewBill)
    const html = NewBillUI()
    document.body.innerHTML = html

    test("Then create bill to mock API", async () => {
      let listBills = await mockStore.bills().list()

      const createSpy = jest.spyOn(mockStore.bills(), "create")
      const updateSpy = jest.spyOn(mockStore.bills(), "update")

      const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage })

      const myNewBill = {
        type: "Restaurants et bars",
        name: "test",
        date: "2021-09-01",
        amount: 100,
        vat: "10",
        pct: 20,
        commentary: "test",
        fileUrl: "https://localhost:8080/src/assets/images/facturefreemobile.jpg",
        fileName: "facturefreemobile.jpg",
        status: "pending",
        email: "e@e"
      }

      // Load bill form field with myNewBill
      screen.getByTestId("expense-type").value = myNewBill.type
      screen.getByTestId("expense-name").value = myNewBill.name
      screen.getByTestId("datepicker").value = myNewBill.date
      screen.getByTestId("amount").value = myNewBill.amount
      screen.getByTestId("vat").value = myNewBill.vat
      screen.getByTestId("pct").value = myNewBill.pct
      screen.getByTestId("commentary").value = myNewBill.commentary


      // Load file
      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      const file = new File([myNewBill.fileName], myNewBill.fileName, { type: 'image/jpg' })
      const fileInput = screen.getByTestId("file")
      fileInput.addEventListener("change", handleChangeFile)
      fireEvent.change(fileInput, { target: { files: [file] } })
      await waitFor(() => {
        expect(handleChangeFile).toHaveBeenCalled()
        expect(fileInput.files[0].name).toBe(file.name)
      })

      // Submit form
      const form = screen.getByTestId("form-new-bill")
      const handleSubmit = jest.fn(newBill.handleSubmit)
      form.addEventListener("submit", handleSubmit)
      await waitFor(() => fireEvent.submit(form))

      // Check if the bill is posted
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalled()
        expect(createSpy).toHaveBeenCalled()
      })
      let result = await createSpy(myNewBill)
      expect(result).toEqual({fileUrl :'https://localhost:8080/src/assets/images/facturefreemobile.jpg', key:'1234'})
      await waitFor(() => expect(updateSpy).toHaveBeenCalled())
      let result2 = await updateSpy(myNewBill)
      expect(result2.fileUrl).not.toBe(listBills[0].fileUrl)
      expect(newBill.onNavigate).toHaveBeenCalledWith(ROUTES_PATH['Bills']);
    })

    describe("An error occurs on API", () => {
      test("Then post new bill to mock API and fails with 404 message error", async () => {
        jest.spyOn(mockStore, "bills")
        jest.spyOn(console, 'error').mockImplementation(() => { })

        mockStore.bills.mockImplementation(() => {
          return {
            create: () => {
              return Promise.reject(new Error("Erreur 404"))
            },
          }
        })

        const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage })
        const handleSubmit = jest.fn(newBill.handleSubmit)
        const form = screen.getByTestId("form-new-bill")
        form.addEventListener("submit", handleSubmit)
        await waitFor(() => fireEvent.submit(form))

        await new Promise(process.nextTick)
        expect(console.error).toHaveBeenCalledWith(new Error("Erreur 404"))
      })

      test("Then post new bill to mock API and fails with 500 message error", async () => {
        jest.spyOn(mockStore, "bills")
        jest.spyOn(console, 'error').mockImplementation(() => { })

        mockStore.bills.mockImplementation(() => {
          return {
            create: () => {
              return Promise.resolve({ fileUrl: 'https://localhost:8080/src/assets/images/facturefreemobile.jpg', key: '1234' })
            },
            update: () => {
              return Promise.reject(new Error("Erreur 500"))
            }
          }
        })

        const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage })
        const handleSubmit = jest.fn(newBill.handleSubmit)
        const form = screen.getByTestId("form-new-bill")
        form.addEventListener("submit", handleSubmit)
        await waitFor(() => fireEvent.submit(form))

        await new Promise(process.nextTick)
        expect(console.error).toHaveBeenCalledWith(new Error("Erreur 500"))
      })

    })
  })
})



